import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import {
  ApiError,
  catalogKeys,
  createApiClient,
  createMemoryRealtimeSource,
  defineEnvironment,
  NetworkError,
  staticTokenProvider,
  type ApiClient,
  type ApiScope,
  type Transport,
} from '@web-boilerplate/sdk-core';
import { createMockApi, DEMO_TOKENS } from '@web-boilerplate/mock-api';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiProvider, isTransient, useCreateItem, useItem, useItems, useRealtimeValue } from '../src/index';

afterEach(cleanup);

const environment = defineEnvironment('test', 'http://mock.test');

function makeClient(transport: Transport, token?: string): ApiClient {
  return createApiClient({ environment, transport, ...(token ? { tokenProvider: staticTokenProvider(token) } : {}) });
}

function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapperFor(queryClient: QueryClient, client: ApiClient, scope: ApiScope) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={client} scope={scope}>
          {children}
        </ApiProvider>
      </QueryClientProvider>
    );
  };
}

describe('query hooks', () => {
  it('load a list through the core getters', async () => {
    const mock = createMockApi();
    const { result } = renderHook(() => useItems({ category: 'home', limit: 3 }), {
      wrapper: wrapperFor(testQueryClient(), makeClient(mock.handle), { environment: 'test', identity: 'anonymous' }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(3);
    expect(result.current.data?.items.every((item) => item.category === 'home')).toBe(true);
  });

  it('surface API failures as ApiError', async () => {
    const mock = createMockApi();
    const { result } = renderHook(() => useItem('broken'), {
      wrapper: wrapperFor(testQueryClient(), makeClient(mock.handle), { environment: 'test', identity: 'anonymous' }),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(500);
  });

  it('abort the request when the last observer unmounts', async () => {
    let seen: Request | undefined;
    const hanging: Transport = (request) => {
      seen = request;
      return new Promise((_, reject) => request.signal.addEventListener('abort', () => reject(request.signal.reason)));
    };
    const { unmount } = renderHook(() => useItem('item-001'), {
      wrapper: wrapperFor(testQueryClient(), makeClient(hanging), { environment: 'test', identity: 'anonymous' }),
    });
    await waitFor(() => expect(seen).toBeDefined());
    unmount();
    await waitFor(() => expect(seen!.signal.aborted).toBe(true));
  });
});

describe('cache isolation', () => {
  it('keeps one cache entry per identity and drops the old identity on switch', async () => {
    const mock = createMockApi();
    const queryClient = testQueryClient();
    const anonymous: ApiScope = { environment: 'test', identity: 'anonymous' };
    const editor: ApiScope = { environment: 'test', identity: 'user-editor' };

    function Probe() {
      const items = useItems({ status: 'draft' });
      return <p>{items.data ? `${items.data.items.length} drafts` : 'loading'}</p>;
    }
    function App({ scope, token }: { scope: ApiScope; token?: string }) {
      return (
        <QueryClientProvider client={queryClient}>
          <ApiProvider client={makeClient(mock.handle, token)} scope={scope}>
            <Probe />
          </ApiProvider>
        </QueryClientProvider>
      );
    }

    const view = render(<App scope={anonymous} />);
    await screen.findByText('0 drafts');
    expect(queryClient.getQueryData(catalogKeys.itemList(anonymous, { status: 'draft' }))).toBeDefined();

    view.rerender(<App scope={editor} token={DEMO_TOKENS.editor} />);
    await screen.findByText(/^[1-9]\d* drafts$/);
    expect(queryClient.getQueryData(catalogKeys.itemList(anonymous, { status: 'draft' }))).toBeUndefined();
    expect(queryClient.getQueryData(catalogKeys.itemList(editor, { status: 'draft' }))).toBeDefined();
  });
});

describe('mutations', () => {
  it('invalidate item lists after a confirmed create, without optimistic writes', async () => {
    const mock = createMockApi();
    const calls: string[] = [];
    const transport: Transport = (request) => {
      calls.push(`${request.method} ${new URL(request.url).pathname}`);
      return mock.handle(request);
    };
    const queryClient = testQueryClient();
    const scope: ApiScope = { environment: 'test', identity: 'user-editor' };
    const { result } = renderHook(() => ({ list: useItems({ q: 'zz test' }), create: useCreateItem() }), {
      wrapper: wrapperFor(queryClient, makeClient(transport, DEMO_TOKENS.editor), scope),
    });
    await waitFor(() => expect(result.current.list.data?.items).toHaveLength(0));

    let pendingCreate!: Promise<unknown>;
    act(() => {
      pendingCreate = result.current.create.mutateAsync({ name: 'zz test item', category: 'office' });
    });
    // Nothing is written to the list before the server answers.
    expect(result.current.list.data?.items).toHaveLength(0);
    await act(() => pendingCreate);

    await waitFor(() => expect(result.current.list.data?.items).toHaveLength(1));
    expect(calls.filter((c) => c === 'GET /items')).toHaveLength(2);
    const created = result.current.list.data!.items[0]!;
    expect(queryClient.getQueryData(catalogKeys.itemDetail(scope, created.id))).toMatchObject({ name: 'zz test item' });
  });
});

describe('retry policy', () => {
  it('retries only transient failures', () => {
    const api = (status: number) => new ApiError({ status, code: 'x', message: 'x' });
    expect(isTransient(api(503))).toBe(true);
    expect(isTransient(api(429))).toBe(true);
    expect(isTransient(new NetworkError(new TypeError('x')))).toBe(true);
    expect(isTransient(api(400))).toBe(false);
    expect(isTransient(api(404))).toBe(false);
    expect(isTransient(new Error('bug'))).toBe(false);
  });
});

describe('useRealtimeValue', () => {
  it('subscribes while mounted, switches channels cleanly and releases on unmount', () => {
    const source = createMemoryRealtimeSource();
    const { result, rerender, unmount } = renderHook(({ channel }) => useRealtimeValue<number>(source, channel), {
      initialProps: { channel: 'a' as string | null },
    });

    act(() => source.emit('a', 1));
    expect(result.current.value).toBe(1);

    rerender({ channel: 'b' });
    expect(source.listenerCount('a')).toBe(0);
    expect(result.current.value).toBeUndefined();
    act(() => source.emit('b', 2));
    expect(result.current.value).toBe(2);

    rerender({ channel: null });
    expect(source.listenerCount()).toBe(0);

    rerender({ channel: 'b' });
    unmount();
    expect(source.listenerCount()).toBe(0);
  });
});

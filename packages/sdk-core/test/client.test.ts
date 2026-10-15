import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  NetworkError,
  createApiClient,
  defineEnvironment,
  getItem,
  getViewer,
  isAbortError,
  listItems,
  staticTokenProvider,
  type Transport,
} from '../src/index';

const environment = defineEnvironment('test', 'https://api.example.test/v1/');

function recordingTransport(respond: (request: Request) => Response | Promise<Response>) {
  const requests: Request[] = [];
  const transport: Transport = async (request) => {
    requests.push(request.clone());
    return respond(request);
  };
  return { transport, requests };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('requests', () => {
  it('builds the URL from the environment, path params and query', async () => {
    const { transport, requests } = recordingTransport(() => json(200, { items: [], nextCursor: null }));
    const api = createApiClient({ environment, transport });

    await listItems(api, { q: 'lamp', category: 'home', limit: 5 });
    await getItem(api, 'a/b c');

    expect(requests[0]!.url).toBe('https://api.example.test/v1/items?q=lamp&category=home&limit=5');
    expect(requests[1]!.url).toBe('https://api.example.test/v1/items/a%2Fb%20c');
    expect(requests[0]!.headers.get('Accept')).toBe('application/json');
  });
});

describe('auth', () => {
  it('sends no Authorization header without a token', async () => {
    const { transport, requests } = recordingTransport(() => json(200, { items: [], nextCursor: null }));
    await listItems(createApiClient({ environment, transport }));
    expect(requests[0]!.headers.has('Authorization')).toBe(false);
  });

  it('asks the provider on every request and never puts the token in the URL', async () => {
    let calls = 0;
    const tokenProvider = { getToken: () => `token-${++calls}` };
    const { transport, requests } = recordingTransport(() =>
      json(200, { id: 'u1', displayName: 'Test', roles: ['viewer'] }),
    );
    const api = createApiClient({ environment, transport, tokenProvider });

    await getViewer(api);
    await getViewer(api);

    expect(requests.map((r) => r.headers.get('Authorization'))).toEqual(['Bearer token-1', 'Bearer token-2']);
    expect(requests.every((r) => !r.url.includes('token'))).toBe(true);
  });

  it('supports async providers', async () => {
    const { transport, requests } = recordingTransport(() => json(200, { id: 'u1', displayName: 'T', roles: [] }));
    const api = createApiClient({
      environment,
      transport,
      tokenProvider: { getToken: async () => 'async-token' },
    });
    await getViewer(api);
    expect(requests[0]!.headers.get('Authorization')).toBe('Bearer async-token');
  });

  it('rejects an empty static token', () => {
    expect(() => staticTokenProvider('')).toThrow();
  });
});

describe('errors', () => {
  it('maps an API error body to ApiError', async () => {
    const { transport } = recordingTransport(() =>
      json(400, {
        code: 'invalid_request',
        message: 'Bad filter',
        requestId: 'req-1',
        fieldErrors: { limit: ['Too big'] },
      }),
    );
    const error = await listItems(createApiClient({ environment, transport })).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'invalid_request',
      message: 'Bad filter',
      requestId: 'req-1',
      fieldErrors: { limit: ['Too big'] },
      isRetryable: false,
    });
  });

  it('copes with a non-JSON error body from a proxy', async () => {
    const { transport } = recordingTransport(
      () => new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    );
    const error = await getItem(createApiClient({ environment, transport }), 'x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'http_502', isRetryable: true, fieldErrors: {} });
  });

  it('wraps transport failures in NetworkError', async () => {
    const transport: Transport = () => Promise.reject(new TypeError('fetch failed'));
    const error = await getItem(createApiClient({ environment, transport }), 'x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).cause).toBeInstanceOf(TypeError);
  });

  it('flags retryable statuses', () => {
    const make = (status: number) => new ApiError({ status, code: 'x', message: 'x' });
    expect([400, 401, 403, 404, 409, 422].map((s) => make(s).isRetryable)).toEqual(Array(6).fill(false));
    expect([408, 429, 500, 503].map((s) => make(s).isRetryable)).toEqual(Array(4).fill(true));
  });
});

describe('abort', () => {
  it('passes the signal to the transport and rethrows AbortError untouched', async () => {
    // Behaves like fetch: rejects at once if the signal is already aborted, or when it aborts later.
    const transport: Transport = (request) =>
      new Promise((_, reject) => {
        if (request.signal.aborted) reject(request.signal.reason);
        request.signal.addEventListener('abort', () => reject(request.signal.reason));
      });
    const api = createApiClient({ environment, transport });
    const controller = new AbortController();

    const pending = listItems(api, {}, { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    const error = await pending;

    expect(isAbortError(error)).toBe(true);
    expect(error).not.toBeInstanceOf(NetworkError);
  });

  it('lets the token provider see the abort signal', async () => {
    const getToken = vi.fn((signal?: AbortSignal) => (signal ? 'with-signal' : 'without-signal'));
    const { transport, requests } = recordingTransport(() => json(200, { id: 'u', displayName: 'U', roles: [] }));
    await getViewer(createApiClient({ environment, transport, tokenProvider: { getToken } }), {
      signal: new AbortController().signal,
    });
    expect(requests[0]!.headers.get('Authorization')).toBe('Bearer with-signal');
  });
});

describe('environments', () => {
  it('normalizes the base URL and refuses unsafe ones', () => {
    expect(defineEnvironment('dev', 'http://127.0.0.1:4010/').baseUrl).toBe('http://127.0.0.1:4010');
    expect(() => defineEnvironment('Dev', 'http://x.test')).toThrow(/environment name/);
    expect(() => defineEnvironment('dev', 'ftp://x.test')).toThrow(/http/);
    expect(() => defineEnvironment('dev', 'https://user:pass@x.test')).toThrow(/credentials/);
    expect(() => defineEnvironment('dev', 'https://x.test/?key=1')).toThrow(/query/);
  });
});

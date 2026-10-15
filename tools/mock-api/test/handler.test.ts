import type { ApiError } from '@web-boilerplate/sdk-core';
import {
  createApiClient,
  createItem,
  defineEnvironment,
  getItem,
  getViewer,
  listItems,
  staticTokenProvider,
  updateItem,
} from '@web-boilerplate/sdk-core';
import { describe, expect, it } from 'vitest';
import { createMockApi, DEMO_TOKENS } from '../src/handler';

// The SDK talks to the mock through the transport seam: no server, no port, same behavior.
function setup(token?: string) {
  const mock = createMockApi({ now: () => new Date('2026-06-01T00:00:00.000Z') });
  return createApiClient({
    environment: defineEnvironment('test', 'http://mock.test'),
    transport: mock.handle,
    ...(token ? { tokenProvider: staticTokenProvider(token) } : {}),
  });
}

/** Resolves with the ApiError a call rejects with; fails the test if the call succeeds. */
async function errorOf(pending: Promise<unknown>): Promise<ApiError> {
  const error = await pending.then(
    () => {
      throw new Error('expected the call to fail');
    },
    (e: unknown) => e,
  );
  return error as ApiError;
}

describe('mock API through the SDK', () => {
  it('pages through published items with a cursor', async () => {
    const api = setup();
    const first = await listItems(api, { limit: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.items.every((item) => item.status === 'published')).toBe(true);

    const seen = new Set(first.items.map((item) => item.id));
    let cursor = first.nextCursor;
    while (cursor) {
      const page = await listItems(api, { limit: 10, cursor });
      page.items.forEach((item) => seen.add(item.id));
      cursor = page.nextCursor;
    }
    expect(seen.size).toBe(22);
  });
  it('shows drafts to editors only', async () => {
    const anonymous = await listItems(setup(), { status: 'draft' });
    const editor = await listItems(setup(DEMO_TOKENS.editor), { status: 'draft' });
    expect(anonymous.items).toHaveLength(0);
    expect(editor.items.length).toBeGreaterThan(0);
  });

  it('answers validation, auth, permission, not-found and simulated failures with typed errors', async () => {
    expect(await errorOf(listItems(setup(), { limit: 99 }))).toMatchObject({
      status: 400,
      fieldErrors: { limit: expect.any(Array) },
    });
    expect(await errorOf(getViewer(setup()))).toMatchObject({ status: 401, code: 'unauthenticated' });
    expect(await errorOf(getViewer(setup('forged')))).toMatchObject({ status: 401 });
    expect(await errorOf(createItem(setup(DEMO_TOKENS.viewer), { name: 'Xy', category: 'home' }))).toMatchObject({
      status: 403,
    });
    expect(await errorOf(getItem(setup(), 'nope'))).toMatchObject({ status: 404, code: 'not_found' });
    expect(await errorOf(getItem(setup(), 'broken'))).toMatchObject({ status: 500, isRetryable: true });
  });

  it('creates and updates items for editors, with field errors and conflicts', async () => {
    const api = setup(DEMO_TOKENS.editor);
    const created = await createItem(api, { name: 'Test kettle', category: 'kitchen', tags: ['test'] });
    expect(created).toMatchObject({ status: 'draft', createdAt: '2026-06-01T00:00:00.000Z' });

    const updated = await updateItem(api, created.id, { status: 'published' });
    expect(updated.status).toBe('published');

    const invalid = await errorOf(createItem(api, { name: 'x', category: 'nope' }));
    expect(invalid.fieldErrors).toMatchObject({ name: expect.any(Array), category: expect.any(Array) });

    const duplicate = await errorOf(createItem(api, { name: 'test KETTLE', category: 'kitchen' }));
    expect(duplicate).toMatchObject({ status: 409, code: 'conflict' });
  });
});

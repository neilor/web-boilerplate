import type { components } from '@web-boilerplate/sdk-core';
import fixtures from '../../../contracts/fixtures/catalog.json' with { type: 'json' };

type Item = components['schemas']['Item'];
type ItemStatus = components['schemas']['ItemStatus'];
type Viewer = components['schemas']['Viewer'];
type ApiErrorBody = components['schemas']['ApiError'];

export interface MockApiOptions {
  /** Delay before each answer, to make loading states visible. */
  latencyMs?: number;
  /** Fixed clock for deterministic tests. */
  now?: () => Date;
}

/** Synthetic demo identities. These strings are not secrets: the mock accepts nothing else. */
export const DEMO_TOKENS = {
  editor: 'demo-editor',
  viewer: 'demo-viewer',
} as const;

const VIEWERS: Record<string, Viewer> = {
  [DEMO_TOKENS.editor]: { id: 'user-editor', displayName: 'Demo editor', roles: ['viewer', 'editor'] },
  [DEMO_TOKENS.viewer]: { id: 'user-viewer', displayName: 'Demo viewer', roles: ['viewer'] },
};

/** Item ids that always fail, so error screens can be exercised without editing code. */
export const FAILING_ITEM_ID = 'broken';

const STATUSES: readonly ItemStatus[] = ['draft', 'published', 'archived'];
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Access-Control-Max-Age': '600',
};

/**
 * A fetch-style handler: `(Request) => Promise<Response>`. The same function backs the local HTTP
 * server and is injected as the SDK transport in tests, so both run against identical behavior.
 * Every call to createMockApi starts from a fresh copy of the fixtures.
 */
export function createMockApi(options: MockApiOptions = {}) {
  const now = options.now ?? (() => new Date());
  let items: Item[] = structuredClone(fixtures.items) as Item[];
  let sequence = items.length;
  let requestCounter = 0;

  async function handle(request: Request): Promise<Response> {
    if (options.latencyMs) await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
    const requestId = `req-${String(++requestCounter).padStart(5, '0')}`;
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    const auth = authenticate(request);
    if (auth === 'invalid') return error(401, 'unauthenticated', 'The access token is not valid.', requestId);
    const viewer = auth;
    const isEditor = viewer?.roles.includes('editor') ?? false;

    if (path === '/items' && request.method === 'GET') return listItems(url, isEditor, requestId);
    if (path === '/items' && request.method === 'POST') {
      const denied = requireEditor(viewer, requestId);
      if (denied) return denied;
      return createItem(await readJson(request), requestId);
    }
    if (path === '/categories' && request.method === 'GET') return json(200, fixtures.categories);
    if (path === '/me' && request.method === 'GET') {
      return viewer ? json(200, viewer) : error(401, 'unauthenticated', 'Sign in to continue.', requestId);
    }

    const match = /^\/items\/([^/]+)$/.exec(path);
    if (match) {
      const itemId = decodeURIComponent(match[1]!);
      if (itemId === FAILING_ITEM_ID) return error(500, 'internal', 'Simulated server failure.', requestId);
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item || (!isEditor && item.status !== 'published')) {
        return error(404, 'not_found', 'Item not found.', requestId);
      }
      if (request.method === 'GET') return json(200, item);
      if (request.method === 'PATCH') {
        const denied = requireEditor(viewer, requestId);
        if (denied) return denied;
        return updateItem(item, await readJson(request), requestId);
      }
    }
    return error(404, 'not_found', 'No such route in the mock.', requestId);
  }

  function listItems(url: URL, isEditor: boolean, requestId: string): Response {
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const cursor = url.searchParams.get('cursor');

    const fieldErrors: Record<string, string[]> = {};
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) fieldErrors.limit = ['Must be between 1 and 50.'];
    if (status && !STATUSES.includes(status as ItemStatus)) fieldErrors.status = ['Unknown status.'];
    if (q.length > 100) fieldErrors.q = ['At most 100 characters.'];
    const offset = cursor === null ? 0 : decodeCursor(cursor);
    if (offset === null) fieldErrors.cursor = ['Invalid cursor.'];
    if (Object.keys(fieldErrors).length > 0) {
      return error(400, 'invalid_request', 'Invalid query parameters.', requestId, fieldErrors);
    }

    const visible = items
      .filter((item) => isEditor || item.status === 'published')
      .filter((item) => !category || item.category === category)
      .filter((item) => !status || item.status === status)
      .filter((item) => !q || `${item.name} ${item.description}`.toLowerCase().includes(q))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.id.localeCompare(b.id)));

    const start = offset ?? 0;
    const page = visible.slice(start, start + limit);
    const next = start + limit < visible.length ? encodeCursor(start + limit) : null;
    return json(200, {
      items: page.map(({ id, name, category: c, status: s, updatedAt }) => ({
        id,
        name,
        category: c,
        status: s,
        updatedAt,
      })),
      nextCursor: next,
    });
  }

  function createItem(body: unknown, requestId: string): Response {
    const result = validateItemFields(body, { partial: false, allowStatus: false });
    if (!result.ok) return error(400, 'invalid_request', 'The item is not valid.', requestId, result.fieldErrors);
    const input = result.value;
    if (items.some((item) => item.name.toLowerCase() === input.name!.toLowerCase())) {
      return error(409, 'conflict', 'An item with this name already exists.', requestId, { name: ['Already taken.'] });
    }
    const timestamp = now().toISOString();
    const item: Item = {
      id: `item-${String(++sequence).padStart(3, '0')}`,
      name: input.name!,
      category: input.category!,
      status: 'draft',
      description: input.description ?? '',
      tags: input.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    items = [item, ...items];
    return json(201, item);
  }

  function updateItem(item: Item, body: unknown, requestId: string): Response {
    const result = validateItemFields(body, { partial: true, allowStatus: true });
    if (!result.ok) return error(400, 'invalid_request', 'The change is not valid.', requestId, result.fieldErrors);
    const patch = result.value;
    if (
      patch.name &&
      items.some((other) => other.id !== item.id && other.name.toLowerCase() === patch.name!.toLowerCase())
    ) {
      return error(409, 'conflict', 'An item with this name already exists.', requestId, { name: ['Already taken.'] });
    }
    const updated: Item = { ...item, ...patch, updatedAt: now().toISOString() };
    items = items.map((candidate) => (candidate.id === item.id ? updated : candidate));
    return json(200, updated);
  }

  function reset() {
    items = structuredClone(fixtures.items) as Item[];
    sequence = items.length;
  }

  return { handle, reset };
}

function authenticate(request: Request): Viewer | null | 'invalid' {
  const header = request.headers.get('Authorization');
  if (!header) return null;
  const token = /^Bearer (.+)$/.exec(header)?.[1];
  return (token && VIEWERS[token]) || 'invalid';
}

function requireEditor(viewer: Viewer | null, requestId: string): Response | null {
  if (!viewer) return error(401, 'unauthenticated', 'Sign in to continue.', requestId);
  if (!viewer.roles.includes('editor')) return error(403, 'forbidden', 'Editors only.', requestId);
  return null;
}

type ItemFields = Partial<Pick<Item, 'name' | 'category' | 'description' | 'tags' | 'status'>>;

function validateItemFields(
  body: unknown,
  { partial, allowStatus }: { partial: boolean; allowStatus: boolean },
): { ok: true; value: ItemFields } | { ok: false; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, fieldErrors: { body: ['Expected a JSON object.'] } };
  }
  const record = body as Record<string, unknown>;
  const allowed = new Set([
    'name',
    'description',
    'tags',
    ...(allowStatus ? ['status'] : []),
    ...(partial ? [] : ['category']),
  ]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) fieldErrors[key] = ['Unknown field.'];

  const { name, category, description, tags, status } = record;
  if (name !== undefined || !partial) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      fieldErrors.name = ['Between 2 and 80 characters.'];
    }
  }
  if (!partial && (typeof category !== 'string' || !fixtures.categories.some((c) => c.id === category))) {
    fieldErrors.category = ['Pick an existing category.'];
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    fieldErrors.description = ['At most 2000 characters.'];
  }
  if (
    tags !== undefined &&
    (!Array.isArray(tags) || tags.length > 10 || tags.some((tag) => typeof tag !== 'string' || tag.length > 30))
  ) {
    fieldErrors.tags = ['Up to 10 tags of at most 30 characters.'];
  }
  if (status !== undefined && !STATUSES.includes(status as ItemStatus)) fieldErrors.status = ['Unknown status.'];
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const value: ItemFields = {};
  if (typeof name === 'string') value.name = name.trim();
  if (typeof category === 'string') value.category = category;
  if (typeof description === 'string') value.description = description;
  if (Array.isArray(tags)) value.tags = tags as string[];
  if (typeof status === 'string') value.status = status as ItemStatus;
  return { ok: true, value };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function encodeCursor(offset: number): string {
  return btoa(`o:${offset}`).replace(/=+$/, '');
}

function decodeCursor(cursor: string): number | null {
  try {
    const match = /^o:(\d+)$/.exec(atob(cursor));
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(
  status: number,
  code: string,
  message: string,
  requestId: string,
  fieldErrors?: Record<string, string[]>,
): Response {
  const body: ApiErrorBody = { code, message, requestId, ...(fieldErrors ? { fieldErrors } : {}) };
  return json(status, body);
}

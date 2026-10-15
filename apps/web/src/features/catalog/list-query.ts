import { normalizeListQuery, type ItemStatus, type ListItemsQuery } from '@web-boilerplate/sdk-core';

const STATUSES: readonly ItemStatus[] = ['draft', 'published', 'archived'];

type SearchParamsLike = Record<string, string | string[] | undefined> | URLSearchParams;

/** URL search params -> list query. Unknown or malformed values are dropped, never forwarded. */
export function parseListQuery(params: SearchParamsLike): ListItemsQuery {
  const get = (key: string): string | undefined => {
    const value = params instanceof URLSearchParams ? (params.get(key) ?? undefined) : params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const status = get('status');
  return normalizeListQuery({
    q: get('q')?.slice(0, 100),
    category: get('category'),
    status: STATUSES.includes(status as ItemStatus) ? (status as ItemStatus) : undefined,
    cursor: get('cursor'),
  });
}

/** List query -> URL search string, in a stable key order (`?q=..&category=..`), or '' when empty. */
export function toSearchString(query: ListItemsQuery): string {
  const params = new URLSearchParams();
  for (const key of ['q', 'category', 'status', 'cursor'] as const) {
    const value = query[key];
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

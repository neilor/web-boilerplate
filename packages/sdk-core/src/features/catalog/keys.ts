import { apiKeys, type ApiScope } from '../../keys';
import type { ListItemsQuery } from './types';

/** Drops empty filters so equivalent requests share one cache entry. Key order does not matter in TanStack keys. */
export function normalizeListQuery(query: ListItemsQuery = {}): ListItemsQuery {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    normalized[key] = typeof value === 'string' ? value.trim() : value;
  }
  return normalized as ListItemsQuery;
}

export const catalogKeys = {
  all: (scope: ApiScope) => [...apiKeys.scope(scope), 'catalog'] as const,
  items: (scope: ApiScope) => [...catalogKeys.all(scope), 'items'] as const,
  itemLists: (scope: ApiScope) => [...catalogKeys.items(scope), 'list'] as const,
  itemList: (scope: ApiScope, query?: ListItemsQuery) =>
    [...catalogKeys.itemLists(scope), normalizeListQuery(query)] as const,
  itemDetails: (scope: ApiScope) => [...catalogKeys.items(scope), 'detail'] as const,
  itemDetail: (scope: ApiScope, itemId: string) => [...catalogKeys.itemDetails(scope), itemId] as const,
  categories: (scope: ApiScope) => [...catalogKeys.all(scope), 'categories'] as const,
};

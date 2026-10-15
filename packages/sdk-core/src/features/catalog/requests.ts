import { unwrap, type ApiClient, type CallOptions } from '../../client';
import type { ItemInput, ItemPatch, ListItemsQuery } from './types';

// One getter per operation the features use. Each is a thin, typed call: no caching, no React,
// no business rules. Usable from a React hook, a server component, a script or a test.

export function listItems(api: ApiClient, query: ListItemsQuery = {}, { signal }: CallOptions = {}) {
  return unwrap(api.http.GET('/items', { params: { query }, signal }));
}

export function getItem(api: ApiClient, itemId: string, { signal }: CallOptions = {}) {
  return unwrap(api.http.GET('/items/{itemId}', { params: { path: { itemId } }, signal }));
}

export function createItem(api: ApiClient, input: ItemInput, { signal }: CallOptions = {}) {
  return unwrap(api.http.POST('/items', { body: input, signal }));
}

export function updateItem(api: ApiClient, itemId: string, patch: ItemPatch, { signal }: CallOptions = {}) {
  return unwrap(api.http.PATCH('/items/{itemId}', { params: { path: { itemId } }, body: patch, signal }));
}

export function listCategories(api: ApiClient, { signal }: CallOptions = {}) {
  return unwrap(api.http.GET('/categories', { signal }));
}

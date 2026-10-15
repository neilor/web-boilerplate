import { unwrap, type ApiClient, type CallOptions } from '../../client';
import type { components } from '../../generated/catalog';
import { apiKeys, type ApiScope } from '../../keys';

export type Viewer = components['schemas']['Viewer'];

export function getViewer(api: ApiClient, { signal }: CallOptions = {}) {
  return unwrap(api.http.GET('/me', { signal }));
}

export const viewerKeys = {
  current: (scope: ApiScope) => [...apiKeys.scope(scope), 'viewer'] as const,
};

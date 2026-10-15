import type { ApiClient, ApiScope } from '@web-boilerplate/sdk-core';

/** What a query needs to run: a configured client and the scope its cache entries belong to. */
export interface ApiContextValue {
  readonly client: ApiClient;
  readonly scope: ApiScope;
}

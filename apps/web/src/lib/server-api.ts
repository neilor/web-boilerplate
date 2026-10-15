import 'server-only';
import { createApiClient, staticTokenProvider, anonymousTokenProvider } from '@web-boilerplate/sdk-core';
import type { ApiContextValue } from '@web-boilerplate/sdk-react';
import { cache } from 'react';
import { getServerEnvironment } from './config';
import { DEMO_IDENTITIES } from './demo-identity';
import { getDemoSession } from './demo-session';

/**
 * The API client for the current request. `cache` scopes it to one render pass: two components
 * of the same request share it, two requests never do. Requests are `no-store` because the
 * answers depend on who is asking.
 */
export const getServerApi = cache(async (): Promise<ApiContextValue> => {
  const identity = await getDemoSession();
  const { token, subject } = DEMO_IDENTITIES[identity];
  const environment = getServerEnvironment();
  const client = createApiClient({
    environment,
    tokenProvider: token ? staticTokenProvider(token) : anonymousTokenProvider,
    requestInit: { cache: 'no-store' },
  });
  return { client, scope: { environment: environment.name, identity: subject } };
});

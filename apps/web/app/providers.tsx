'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import {
  anonymousTokenProvider,
  createApiClient,
  defineEnvironment,
  staticTokenProvider,
} from '@web-boilerplate/sdk-core';
import { ApiProvider, createQueryClient } from '@web-boilerplate/sdk-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DEMO_IDENTITIES, type DemoIdentity } from '@/lib/demo-identity';

/**
 * Browser side of the data layer. One QueryClient per browser tab (created once in state, so a
 * re-render never wipes the cache), and one API client per environment + identity.
 * On the server, pages build their own per-request QueryClient; nothing here is shared between users.
 */
export function Providers({
  environment,
  baseUrl,
  identity,
  children,
}: {
  environment: string;
  baseUrl: string;
  identity: DemoIdentity;
  children: ReactNode;
}) {
  const [queryClient] = useState(createQueryClient);
  const { token, subject } = DEMO_IDENTITIES[identity];

  const client = useMemo(
    () =>
      createApiClient({
        environment: defineEnvironment(environment, baseUrl),
        tokenProvider: token ? staticTokenProvider(token) : anonymousTokenProvider,
      }),
    [environment, baseUrl, token],
  );
  const scope = useMemo(() => ({ environment, identity: subject }), [environment, subject]);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={client} scope={scope}>
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { apiKeys, type ApiClient, type ApiScope } from '@web-boilerplate/sdk-core';
import { createContext, use, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { ApiContextValue } from './queries';

const ApiContext = createContext<ApiContextValue | null>(null);

/**
 * Makes one API client and its scope available to the hooks below. Must sit inside a
 * QueryClientProvider. When the scope changes (sign-in, sign-out, another environment), the
 * cached data of the previous scope is dropped from memory.
 */
export function ApiProvider({ client, scope, children }: { client: ApiClient; scope: ApiScope; children: ReactNode }) {
  const queryClient = useQueryClient();
  const value = useMemo(() => ({ client, scope }), [client, scope]);
  const previous = useRef(scope);

  useEffect(() => {
    const before = previous.current;
    if (before.environment !== scope.environment || before.identity !== scope.identity) {
      queryClient.removeQueries({ queryKey: apiKeys.scope(before) });
      previous.current = scope;
    }
  }, [queryClient, scope]);

  return <ApiContext value={value}>{children}</ApiContext>;
}

export function useApi(): ApiContextValue {
  const value = use(ApiContext);
  if (!value) throw new Error('useApi must be used inside <ApiProvider>.');
  return value;
}

import { QueryClient } from '@tanstack/react-query';
import { ApiError, NetworkError } from '@web-boilerplate/sdk-core';

/**
 * Query defaults shared by server and browser.
 * - Retries only what can succeed on a retry (network failures, 408/429/5xx), at most twice.
 * - Mutations never retry: a write that timed out may have been applied.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < 2 && isTransient(error),
      },
      mutations: { retry: false },
    },
  });
}

export function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) return error.isRetryable;
  return error instanceof NetworkError;
}

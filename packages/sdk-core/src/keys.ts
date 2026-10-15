/**
 * Who is asking, and where. Every query key starts with it, so cached data from one environment
 * or one signed-in identity can never be served to another.
 *
 * `identity` is a stable, non-secret subject id ("anonymous", a user id). Never a token.
 */
export interface ApiScope {
  readonly environment: string;
  readonly identity: string;
}

export const ANONYMOUS_IDENTITY = 'anonymous';

/** Root of every key. Feature key factories extend it; removing it drops a whole scope from the cache. */
export const apiKeys = {
  scope: (scope: ApiScope) => ['api', scope.environment, scope.identity] as const,
};

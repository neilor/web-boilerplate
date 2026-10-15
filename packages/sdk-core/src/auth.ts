/**
 * Supplies the access token for a request. The SDK never stores tokens: it asks the provider on
 * every request, so refresh and sign-out are the auth layer's job, not the SDK's.
 *
 * Adapters for a real identity provider (a hosted auth SDK, a session cookie exchanged on the
 * server, ...) live next to that provider and implement this one function. UI code never calls
 * the identity SDK to build requests.
 */
export interface TokenProvider {
  getToken(signal?: AbortSignal): string | null | Promise<string | null>;
}

/** No credentials: public endpoints only. */
export const anonymousTokenProvider: TokenProvider = Object.freeze({
  getToken: () => null,
});

/** A fixed token. Meant for tests, scripts and the local mock, never for a browser bundle. */
export function staticTokenProvider(token: string): TokenProvider {
  if (!token) throw new Error('staticTokenProvider needs a non-empty token.');
  return Object.freeze({ getToken: () => token });
}

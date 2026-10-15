import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { anonymousTokenProvider, type TokenProvider } from './auth';
import type { ApiEnvironment } from './environment';
import { ApiError, NetworkError, isAbortError } from './errors';
import type { paths } from './generated/catalog';

/** Sends one HTTP request. Defaults to the platform `fetch`; tests and special runtimes inject their own. */
export type Transport = (request: Request) => Promise<Response>;

export interface ApiClientOptions {
  environment: ApiEnvironment;
  tokenProvider?: TokenProvider;
  transport?: Transport;
  /**
   * Defaults applied to every request, e.g. `{ cache: 'no-store' }` for per-user data on a server.
   * Only cache and credential policy: method, body, headers and signal belong to each call.
   */
  requestInit?: Pick<RequestInit, 'cache' | 'credentials' | 'redirect' | 'referrerPolicy'>;
}

/**
 * One configured API connection. Create one per environment and identity: on a server that means
 * one per incoming request, never a module-level singleton shared by every user.
 */
export interface ApiClient {
  readonly environment: ApiEnvironment;
  /** The typed openapi-fetch client, for operations that have no getter yet. */
  readonly http: Client<paths>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { environment, tokenProvider = anonymousTokenProvider, transport, requestInit } = options;
  const http = createClient<paths>({
    baseUrl: environment.baseUrl,
    headers: { Accept: 'application/json' },
    ...(transport ? { fetch: transport } : {}),
    ...requestInit,
  });
  http.use(bearerAuth(tokenProvider));
  return Object.freeze({ environment, http });
}

function bearerAuth(tokenProvider: TokenProvider): Middleware {
  return {
    async onRequest({ request }) {
      const token = await tokenProvider.getToken(request.signal);
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  };
}

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/** Per-call options every getter accepts. */
export interface CallOptions {
  signal?: AbortSignal;
}

/**
 * Turns an openapi-fetch result into a plain value or a typed throw:
 * - non-2xx -> ApiError (with the API's code, message and field errors);
 * - no HTTP answer -> NetworkError;
 * - cancelled by the caller -> the original AbortError, untouched.
 */
export async function unwrap<T>(pending: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await pending;
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new NetworkError(error);
  }
  if (!result.response.ok || result.error !== undefined) {
    throw ApiError.fromResponse(result.response, result.error);
  }
  return result.data as T;
}

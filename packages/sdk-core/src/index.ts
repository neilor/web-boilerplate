// Public entry point. Anything not exported here is internal and may change without notice.
export { anonymousTokenProvider, staticTokenProvider, type TokenProvider } from './auth';
export {
  createApiClient,
  unwrap,
  type ApiClient,
  type ApiClientOptions,
  type CallOptions,
  type Transport,
} from './client';
export { defineEnvironment, type ApiEnvironment } from './environment';
export { ApiError, NetworkError, isAbortError } from './errors';
export * from './features/catalog/index';
export { getViewer, viewerKeys, type Viewer } from './features/viewer/index';
export { ANONYMOUS_IDENTITY, apiKeys, type ApiScope } from './keys';
export { createMemoryRealtimeSource, type RealtimeListener, type RealtimeSource, type Unsubscribe } from './realtime';
export type { components, operations, paths } from './generated/catalog';

/**
 * Optional contract for push-based data (a realtime database, server-sent events, a websocket).
 * Request/response data goes through the HTTP getters; only values that must update live use this.
 *
 * Contract every implementation must keep:
 * 1. `subscribe` returns an `Unsubscribe` function. Calling it releases the underlying listener.
 * 2. `Unsubscribe` is idempotent: calling it twice is harmless.
 * 3. After `Unsubscribe` returns, the listener is never called again, even for values already in flight.
 * 4. Each `subscribe` call is independent: unsubscribing one listener never affects another.
 * 5. Errors go to `listener.error`. After an error the subscription is closed by the source.
 *
 * Callers (React effects, server streams, scripts) must call `Unsubscribe` when they stop
 * caring: on unmount, on navigation, on identity change. Leaked listeners keep sockets open
 * and keep billing reads.
 */
export type Unsubscribe = () => void;

export interface RealtimeListener<T> {
  next(value: T): void;
  error?(error: unknown): void;
}

export interface RealtimeSource {
  subscribe<T>(channel: string, listener: RealtimeListener<T>): Unsubscribe;
}

/** In-memory source for tests and the local demo. No network, no credentials. */
export function createMemoryRealtimeSource() {
  const listeners = new Map<string, Set<RealtimeListener<unknown>>>();

  const source: RealtimeSource & {
    emit(channel: string, value: unknown): void;
    fail(channel: string, error: unknown): void;
    listenerCount(channel?: string): number;
  } = {
    subscribe<T>(channel: string, listener: RealtimeListener<T>): Unsubscribe {
      const entry = { ...listener } as RealtimeListener<unknown>;
      let set = listeners.get(channel);
      if (!set) listeners.set(channel, (set = new Set()));
      set.add(entry);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        set.delete(entry);
        if (set.size === 0) listeners.delete(channel);
      };
    },
    emit(channel, value) {
      for (const listener of [...(listeners.get(channel) ?? [])]) {
        if (listeners.get(channel)?.has(listener)) listener.next(value);
      }
    },
    fail(channel, error) {
      const set = listeners.get(channel);
      listeners.delete(channel);
      for (const listener of [...(set ?? [])]) listener.error?.(error);
    },
    listenerCount(channel) {
      if (channel !== undefined) return listeners.get(channel)?.size ?? 0;
      let total = 0;
      for (const set of listeners.values()) total += set.size;
      return total;
    },
  };
  return source;
}

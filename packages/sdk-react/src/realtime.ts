'use client';

import type { RealtimeSource } from '@web-boilerplate/sdk-core';
import { useEffect, useState } from 'react';

export interface RealtimeState<T> {
  value: T | undefined;
  error: unknown;
}

/**
 * Subscribes while mounted and unsubscribes on unmount or when the channel changes,
 * following the RealtimeSource cleanup contract. Pass `null` to stay unsubscribed.
 */
export function useRealtimeValue<T>(source: RealtimeSource, channel: string | null): RealtimeState<T> {
  const [state, setState] = useState<RealtimeState<T> & { channel: string | null }>({
    channel,
    value: undefined,
    error: undefined,
  });

  useEffect(() => {
    if (channel === null) return;
    return source.subscribe<T>(channel, {
      next: (value) => setState({ channel, value, error: undefined }),
      error: (error) => setState((s) => ({ ...s, channel, error })),
    });
  }, [source, channel]);

  // A value from the previous channel is never shown for the new one.
  return state.channel === channel
    ? { value: state.value, error: state.error }
    : { value: undefined, error: undefined };
}

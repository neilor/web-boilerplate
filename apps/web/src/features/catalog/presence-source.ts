import type { RealtimeListener, RealtimeSource } from '@web-boilerplate/sdk-core';

/**
 * A simulated realtime source: "people viewing this item", made up locally every few seconds.
 * It shows the cleanup contract in practice: the timer exists only while someone listens,
 * and unsubscribing clears it.
 */
export function createSimulatedPresenceSource(intervalMs = 3000): RealtimeSource {
  return {
    subscribe<T>(channel: string, listener: RealtimeListener<T>) {
      let seed = [...channel].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      let active = true;
      const tick = () => {
        if (!active) return;
        seed = (seed * 9301 + 49297) % 233280;
        listener.next((1 + (seed % 7)) as T);
      };
      const first = setTimeout(tick, 0);
      const timer = setInterval(tick, intervalMs);
      return () => {
        active = false;
        clearTimeout(first);
        clearInterval(timer);
      };
    },
  };
}

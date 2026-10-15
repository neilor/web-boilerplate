'use client';

import { ErrorState } from '@/components/async-state';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} />;
}

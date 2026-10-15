import { describeError } from '@/lib/describe-error';

// Presentational states shared by every screen. They only render what they are given.

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="state" role="status">
      <p className="state-title">{title}</p>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry, retrying }: { error: unknown; onRetry?: () => void; retrying?: boolean }) {
  const { title, detail, reference } = describeError(error);
  return (
    <div className="state state-error" role="alert">
      <p className="state-title">{title}</p>
      <p>{detail}</p>
      {reference ? <p className="muted">Reference: {reference}</p> : null}
      {onRetry ? (
        <button type="button" className="button" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      ) : null}
    </div>
  );
}

import { ApiError, NetworkError } from '@web-boilerplate/sdk-core';

/** A message people can act on, plus a reference support can search for. Never a stack trace. */
export function describeError(error: unknown): { title: string; detail: string; reference?: string } {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) return { title: 'Sign in required', detail: error.message, reference: error.requestId };
    if (error.status === 403) return { title: 'Not allowed', detail: error.message, reference: error.requestId };
    if (error.isNotFound) return { title: 'Not found', detail: error.message, reference: error.requestId };
    return {
      title: error.isRetryable ? 'The service had a problem' : 'Request not accepted',
      detail: error.message,
      reference: error.requestId,
    };
  }
  if (error instanceof NetworkError) {
    return { title: 'Cannot reach the service', detail: 'Check your connection and try again.' };
  }
  return { title: 'Something went wrong', detail: 'Try again in a moment.' };
}

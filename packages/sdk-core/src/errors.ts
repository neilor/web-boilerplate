/** The API answered with a non-2xx status. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly requestId: string | undefined;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: Readonly<Record<string, readonly string[]>>;
    requestId?: string | undefined;
  }) {
    super(init.message);
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? {};
    this.requestId = init.requestId;
  }

  /** Builds the error from whatever body came back, including non-JSON bodies from proxies. */
  static fromResponse(response: Response, body: unknown): ApiError {
    const record = isRecord(body) ? body : {};
    return new ApiError({
      status: response.status,
      code: typeof record.code === 'string' ? record.code : `http_${response.status}`,
      message: typeof record.message === 'string' ? record.message : response.statusText || `HTTP ${response.status}`,
      fieldErrors: isFieldErrors(record.fieldErrors) ? record.fieldErrors : undefined,
      requestId: typeof record.requestId === 'string' ? record.requestId : undefined,
    });
  }

  /** Worth retrying automatically: rate limits and server-side failures. Never 4xx validation. */
  get isRetryable(): boolean {
    return this.status === 408 || this.status === 429 || this.status >= 500;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** The request never got an HTTP answer (DNS, connection reset, CORS, offline). */
export class NetworkError extends Error {
  override readonly name = 'NetworkError';
  constructor(cause: unknown) {
    super('The API could not be reached.', { cause });
  }
}

/** True when the caller cancelled the request through its AbortSignal. Not an error to report. */
export function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  return (
    isRecord(value) &&
    Object.values(value).every((v) => Array.isArray(v) && v.every((item) => typeof item === 'string'))
  );
}

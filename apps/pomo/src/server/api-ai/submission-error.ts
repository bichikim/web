import type {ApiAiSubmissionError} from './types'

const HTTP_CLIENT_ERROR = 400
const HTTP_SERVER_ERROR = 500
const HTTP_REQUEST_TIMEOUT = 408
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_RATE_LIMIT = 429
const HTTP_UNAVAILABLE = 503
const MILLISECONDS_PER_SECOND = 1000
const DEFAULT_RETRY_MILLISECONDS = 30_000
const MAXIMUM_ERROR_LENGTH = 2000

interface ProviderError {
  readonly status?: number
  readonly code?: string | null
  readonly headers?: Headers
}

const readProviderError = (error: unknown): ProviderError => {
  if (typeof error !== 'object' || error === null) {
    return {}
  }
  return {
    code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
    headers: 'headers' in error && error.headers instanceof Headers ? error.headers : undefined,
    status: 'status' in error && typeof error.status === 'number' ? error.status : undefined,
  }
}

const readRetryAt = (headers: Headers | undefined, now: number): number => {
  const delay = headers?.get('retry-after')
  const seconds = delay === undefined || delay === null ? Number.NaN : Number(delay)
  const date = delay === undefined || delay === null ? Number.NaN : Date.parse(delay)
  return Number.isFinite(seconds) && seconds >= 0
    ? now + seconds * MILLISECONDS_PER_SECOND
    : Number.isFinite(date)
      ? Math.max(now, date)
      : now + DEFAULT_RETRY_MILLISECONDS
}

/** Classifies confirmed rejection separately from inconclusive provider acceptance. */
export const classifyApiAiSubmissionError = (error: unknown, now: number): ApiAiSubmissionError => {
  const {status, code, headers} = readProviderError(error)
  const overloaded = status === HTTP_UNAVAILABLE && code === 'server_is_overloaded'
  const rejected =
    overloaded ||
    (status !== undefined &&
      status >= HTTP_CLIENT_ERROR &&
      status < HTTP_SERVER_ERROR &&
      status !== HTTP_REQUEST_TIMEOUT)
  const disabled =
    status === HTTP_UNAUTHORIZED ||
    status === HTTP_FORBIDDEN ||
    code === 'insufficient_quota' ||
    code === 'billing_hard_limit_reached'
  return {
    acceptance: rejected ? 'rejected' : 'unknown',
    disabled,
    fallback:
      rejected &&
      (overloaded || code === 'model_not_found' || disabled || status === HTTP_RATE_LIMIT),
    message:
      error instanceof Error
        ? error.message.slice(0, MAXIMUM_ERROR_LENGTH)
        : 'AI provider submission failed',
    retryAt: readRetryAt(headers, now),
  }
}

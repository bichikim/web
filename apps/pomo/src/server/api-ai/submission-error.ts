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
const SHORT_YEAR_LENGTH = 2
const HTTP_DATE = new RegExp(
  [
    '^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), [0-9]{2} [A-Za-z]{3} [0-9]{4}',
    '|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), [0-9]{2}-[A-Za-z]{3}-[0-9]{2})',
    ' [0-9]{2}:[0-9]{2}:[0-9]{2} GMT$',
  ].join(''),
  'iu',
)
const ASCTIME_DATE =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Za-z]{3} (?: [0-9]|[0-9]{2}) [0-9]{2}:[0-9]{2}:[0-9]{2} [0-9]{4}$/iu

const HTTP_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

const readHttpDate = (header: string): number => {
  // Date는 윤초를 표현하지 못하므로 직전 초에서 검증한 뒤 1초를 더한다.
  const normalizedHeader = header.replace(/23:59:60(?= (?:GMT|[0-9]{4})$)/iu, '23:59:59')
  // asctime 형식은 시간대가 생략되어도 HTTP 계약의 GMT를 기준으로 해석한다.
  const timestamp = HTTP_DATE.test(header)
    ? Date.parse(normalizedHeader)
    : ASCTIME_DATE.test(header)
      ? Date.parse(`${normalizedHeader} GMT`)
      : Number.NaN
  if (!Number.isFinite(timestamp)) {
    return Number.NaN
  }
  const date = new Date(timestamp)
  const utc = date.toUTCString()
  const [weekday, day, month, year, time] = utc.split(' ')
  // Date.parse가 잘못된 날짜나 24시를 다음 날짜로 보정한 경우 원문과 일치하지 않는다.
  const forms = [
    utc,
    `${HTTP_WEEKDAYS[date.getUTCDay()]}, ${day}-${month}-${year.slice(-SHORT_YEAR_LENGTH)} ${time} GMT`,
    `${weekday.replace(',', '')} ${month} ${day} ${time} ${year}`,
    `${weekday.replace(',', '')} ${month} ${day.startsWith('0') ? ` ${day.slice(1)}` : day} ${time} ${year}`,
  ]
  return forms.some((form) => form.toLowerCase() === normalizedHeader.toLowerCase())
    ? timestamp + (normalizedHeader === header ? 0 : MILLISECONDS_PER_SECOND)
    : Number.NaN
}

const readRetryAt = (headers: Headers | undefined, now: number): number => {
  const delay = headers?.get('retry-after') ?? ''
  const seconds = /^[0-9]+$/u.test(delay) ? Number(delay) : Number.NaN
  const date = readHttpDate(delay)
  const retryAt = Number.isFinite(seconds)
    ? now + seconds * MILLISECONDS_PER_SECOND
    : Math.max(now, date)
  return Number.isFinite(new Date(retryAt).getTime()) ? retryAt : now + DEFAULT_RETRY_MILLISECONDS
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
    scope: code === 'model_not_found' ? 'model' : 'pool',
  }
}

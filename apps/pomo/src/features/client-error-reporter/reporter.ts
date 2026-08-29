export type ClientErrorSource =
  | 'direct'
  | 'error-boundary'
  | 'global-error'
  | 'report-error'
  | 'unhandled-rejection'
  | 'worker'

export interface ClientErrorRoute {
  readonly origin: string
  readonly template: string
}

export interface ClientErrorContext {
  readonly environment: string
  readonly platform: 'apps-in-toss' | 'web'
  readonly release: string
  readonly route: ClientErrorRoute
}

export interface NormalizedClientError {
  readonly cause?: NormalizedClientError
  readonly code?: string
  readonly message: string
  readonly name: string
  readonly phase?: string
  readonly stack?: string
}

export interface ClientErrorEvent extends ClientErrorContext {
  readonly error: NormalizedClientError
  readonly errorId: string
  readonly feature: string
  readonly source: ClientErrorSource
  readonly timestamp: string
}

export interface ReportClientErrorOptions {
  readonly errorId?: string
  readonly feature: string
  readonly source: ClientErrorSource
}

export interface ClientErrorReceipt {
  readonly deduplicated: boolean
  readonly errorId: string
}

export interface ClientErrorReporter {
  readonly report: (error: unknown, options: ReportClientErrorOptions) => ClientErrorReceipt
}

export interface CreateClientErrorReporterOptions {
  readonly createId?: () => string
  readonly getContext?: () => ClientErrorContext
  readonly now?: () => number
  readonly send: (event: ClientErrorEvent) => Promise<void> | void
}

const IDENTITY_DEDUPLICATION_WINDOW_MILLISECONDS = 2_000
const MAXIMUM_CAUSE_DEPTH = 3
const MAXIMUM_FIELD_LENGTH = 80
const MAXIMUM_MESSAGE_LENGTH = 500
const MAXIMUM_STACK_LENGTH = 4_000
const IDENTIFIER_RADIX = 36
const MAXIMUM_DATE_MILLISECONDS = 8_640_000_000_000_000
const REDACTED = '[REDACTED]'
const REDACTED_EMAIL = '[REDACTED_EMAIL]'
const OMITTED_NON_ERROR = '[Non-Error value omitted]'
const STATIC_ROUTE_TEMPLATES = new Set([
  '/',
  '/account',
  '/app-in-toss/privacy',
  '/app-in-toss/terms',
  '/dev/terms',
  '/dialogue',
  '/focus-room',
  '/focus-room-dialogue',
  '/privacy',
  '/refund-policy',
  '/terms',
  '/third-party-notices',
  '/web/privacy',
  '/web/terms',
])
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/giu
const HTTP_URL_PATTERN = /https?:\/\/[^\s"'<>)}\]]+/giu
const FILE_URL_PATTERN = /file:\/\/\/[^\s"'<>)}\]]+/giu
const AUTHORIZATION_PATTERN = /\b(?:authorization|cookie|set-cookie)\s*[:=]\s*[^\n]+/giu
const BEARER_PATTERN = /\bbearer\s+[\w.~+/=-]+/giu
const SENSITIVE_VALUE_PATTERN =
  // oxlint-disable-next-line eslint-js/max-len -- One explicit policy pattern is easier to audit than dynamically assembled fragments.
  /\b(?:access_token|body|content|conversation|cookie|dialogue|email|link_token|password|refresh_token|response|secret|subject|toss_subject|transcript|verifier|voice)\s*[:=][^\n]*/giu
const TOKEN_QUERY_PATTERN =
  /(?<prefix>[?&](?:link_token|verifier|access_token|refresh_token|token)=)[^&#\s]*/giu
const IDENTIFIER_PATTERN =
  /\b(?:neon[_ -]?(?:id|subject)|session[_ -]?id|toss[_ -]?(?:id|subject)|user[_ -]?id)\s*[:=]\s*[\w.-]+/giu

let fallbackIdSequence = 0

const truncate = (value: string, maximumLength: number) =>
  value.length <= maximumLength ? value : `${value.slice(0, maximumLength)}…`

const getRouteTemplate = (pathname: string): string => {
  if (STATIC_ROUTE_TEMPLATES.has(pathname)) {
    return pathname
  }

  if (pathname.startsWith('/assets/')) {
    return '/assets/*'
  }

  if (pathname.startsWith('/src/')) {
    return '/src/*'
  }

  if (pathname.startsWith('/_build/')) {
    return '/_build/*'
  }

  return '/other'
}

export const normalizeClientErrorUrl = (value: string): string => {
  try {
    const url = new URL(value)
    return `${url.origin}${getRouteTemplate(url.pathname)}`
  } catch {
    return REDACTED
  }
}

const redactText = (value: string): string =>
  value
    .replace(HTTP_URL_PATTERN, normalizeClientErrorUrl)
    .replace(FILE_URL_PATTERN, '[LOCAL_FILE]')
    .replace(TOKEN_QUERY_PATTERN, `$<prefix>${REDACTED}`)
    .replace(AUTHORIZATION_PATTERN, REDACTED)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(SENSITIVE_VALUE_PATTERN, REDACTED)
    .replace(IDENTIFIER_PATTERN, REDACTED)
    .replace(EMAIL_PATTERN, REDACTED_EMAIL)

const readProperty = (value: object, property: string): unknown => {
  try {
    return Reflect.get(value, property)
  } catch {
    return undefined
  }
}

const readSafeString = (value: object, property: string): string | undefined => {
  const propertyValue = readProperty(value, property)
  return typeof propertyValue === 'string' ? propertyValue : undefined
}

const normalizeStack = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined
  }

  const frames = value
    .split('\n')
    .slice(1)
    .filter((line) => /^\s*at\b/u.test(line) || /@https?:\/\//u.test(line))
    .map(redactText)
    .join('\n')

  return frames.length > 0 ? truncate(frames, MAXIMUM_STACK_LENGTH) : undefined
}

const getErrorName = (value: object): string => {
  const name = readSafeString(value, 'name')
  return name === undefined || name.trim().length === 0 ? 'Error' : redactText(name)
}

const getErrorMessage = (value: object): string => {
  const message = readSafeString(value, 'message')
  return message === undefined || message.trim().length === 0
    ? 'No error message'
    : truncate(redactText(message), MAXIMUM_MESSAGE_LENGTH)
}

const normalizeErrorObject = (
  value: object,
  depth: number,
  visited: WeakSet<object>,
): NormalizedClientError => {
  if (visited.has(value)) {
    return {message: 'Circular error cause omitted', name: 'Error'}
  }

  visited.add(value)
  const cause = readProperty(value, 'cause')
  const code = readSafeString(value, 'code')
  const phase = readSafeString(value, 'phase')
  const normalizedCause =
    depth < MAXIMUM_CAUSE_DEPTH && cause !== undefined
      ? normalizeClientErrorValue(cause, depth + 1, visited)
      : undefined
  const stack = normalizeStack(readSafeString(value, 'stack'))

  return {
    ...(normalizedCause === undefined ? {} : {cause: normalizedCause}),
    ...(code === undefined ? {} : {code: truncate(redactText(code), MAXIMUM_FIELD_LENGTH)}),
    message: getErrorMessage(value),
    name: getErrorName(value),
    ...(phase === undefined ? {} : {phase: truncate(redactText(phase), MAXIMUM_FIELD_LENGTH)}),
    ...(stack === undefined ? {} : {stack}),
  }
}

const normalizeClientErrorValue = (
  value: unknown,
  depth: number,
  visited: WeakSet<object>,
): NormalizedClientError => {
  if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
    return normalizeErrorObject(value, depth, visited)
  }

  return {
    message: `${OMITTED_NON_ERROR} (${value === null ? 'null' : typeof value})`,
    name: 'NonErrorRejection',
  }
}

export const normalizeClientError = (value: unknown): NormalizedClientError =>
  normalizeClientErrorValue(value, 0, new WeakSet())

export const createClientErrorId = (): string => {
  const randomValues = new Uint32Array(2)

  try {
    globalThis.crypto.getRandomValues(randomValues)
    const randomId =
      randomValues[0].toString(IDENTIFIER_RADIX) + randomValues[1].toString(IDENTIFIER_RADIX)
    return `POMO-${randomId}`.toUpperCase()
  } catch {
    fallbackIdSequence += 1
    return `POMO-${Date.now().toString(IDENTIFIER_RADIX)}${fallbackIdSequence.toString(IDENTIFIER_RADIX)}`.toUpperCase()
  }
}

const getCurrentRoute = (): ClientErrorRoute => {
  if (typeof location === 'undefined') {
    return {origin: 'server', template: '/unknown'}
  }

  return {origin: location.origin, template: getRouteTemplate(location.pathname)}
}

const getClientErrorContext = (): ClientErrorContext => ({
  environment: import.meta.env.VITE_POMO_ENVIRONMENT ?? import.meta.env.MODE ?? 'unknown',
  platform: import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ? 'apps-in-toss' : 'web',
  release: import.meta.env.VITE_POMO_RELEASE ?? 'local',
  route: getCurrentRoute(),
})

const getErrorIdentity = (value: unknown): object | null =>
  (typeof value === 'object' && value !== null) || typeof value === 'function' ? value : null

const ignoreDeliveryFailure = () => undefined

export const createClientErrorReporter = (
  options: CreateClientErrorReporterOptions,
): ClientErrorReporter => {
  const createId = options.createId ?? createClientErrorId
  const getContext = options.getContext ?? getClientErrorContext
  const now = options.now ?? Date.now
  const identities = new WeakMap<
    object,
    {readonly receipt: ClientErrorReceipt; readonly time: number}
  >()

  const getCurrentTime = () => {
    try {
      const currentTime = now()
      return Number.isFinite(currentTime) && Math.abs(currentTime) <= MAXIMUM_DATE_MILLISECONDS
        ? currentTime
        : Date.now()
    } catch {
      return Date.now()
    }
  }

  const getCurrentContext = () => {
    try {
      return getContext()
    } catch {
      return {
        environment: 'unknown',
        platform: 'web',
        release: 'unknown',
        route: {origin: 'unknown', template: '/unknown'},
      } satisfies ClientErrorContext
    }
  }

  const createReceipt = (reportOptions: ReportClientErrorOptions): ClientErrorReceipt => {
    try {
      return {deduplicated: false, errorId: reportOptions.errorId ?? createId()}
    } catch {
      return {deduplicated: false, errorId: createClientErrorId()}
    }
  }

  const report: ClientErrorReporter['report'] = (error, reportOptions) => {
    const currentTime = getCurrentTime()
    const identity = getErrorIdentity(error)
    const identityEntry = identity === null ? undefined : identities.get(identity)

    const elapsedTime = identityEntry === undefined ? null : currentTime - identityEntry.time

    if (
      identityEntry !== undefined &&
      elapsedTime !== null &&
      elapsedTime >= 0 &&
      elapsedTime <= IDENTITY_DEDUPLICATION_WINDOW_MILLISECONDS
    ) {
      return {...identityEntry.receipt, deduplicated: true}
    }

    const normalizedError = normalizeClientError(error)
    const receipt = createReceipt(reportOptions)
    const event = {
      ...getCurrentContext(),
      error: normalizedError,
      errorId: receipt.errorId,
      feature: reportOptions.feature,
      source: reportOptions.source,
      timestamp: new Date(currentTime).toISOString(),
    } satisfies ClientErrorEvent

    if (identity !== null) {
      identities.set(identity, {receipt, time: currentTime})
    }

    try {
      Promise.resolve(options.send(event)).catch(ignoreDeliveryFailure)
    } catch {
      // Error reporting must never replace the application failure being handled.
    }

    return receipt
  }

  return {report}
}

const sendLocalDiagnostic = (event: ClientErrorEvent) => {
  if (typeof window !== 'undefined' && import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.error('[Pomofi client error]', event)
  }
}

const clientErrorReporter = createClientErrorReporter({send: sendLocalDiagnostic})

export const reportClientError = (error: unknown, options: ReportClientErrorOptions): string =>
  clientErrorReporter.report(error, options).errorId

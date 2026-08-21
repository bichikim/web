const APPS_IN_TOSS_ORIGINS = new Set([
  'https://pomo-app.apps.tossmini.com',
  'https://pomo-app.private-apps.tossmini.com',
  'https://pomo-app.private-web.tossmini.com',
  'https://pomo-app.web.tossmini.com',
])
const VERCEL_HOST_VARIABLES = [
  'VERCEL_URL',
  'VERCEL_BRANCH_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
] as const
const ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS', 'POST']
const ALLOWED_HEADERS = ['Authorization', 'Content-Type']
const PREFLIGHT_VARY_HEADERS = [
  'Origin',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers',
]

interface CorsMiddlewareEvent {
  readonly req: Request
  readonly res: {
    readonly headers: Headers
  }
}

type NextMiddleware = () => unknown | Promise<unknown>

const getVercelOrigin = (host: string | undefined): string | undefined => {
  const value = host?.trim()

  if (!value) {
    return undefined
  }

  try {
    const url = new URL(`https://${value}`)

    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      return undefined
    }

    return url.origin
  } catch {
    return undefined
  }
}

const isAllowedOrigin = (origin: string, requestOrigin: string): boolean => {
  if (APPS_IN_TOSS_ORIGINS.has(origin)) {
    return true
  }

  if (process.env.NODE_ENV === 'development' && origin === requestOrigin) {
    return true
  }

  return VERCEL_HOST_VARIABLES.some((variable) => {
    const vercelOrigin = getVercelOrigin(process.env[variable])
    return vercelOrigin !== undefined && origin === vercelOrigin
  })
}

const isApiPath = (pathname: string): boolean => pathname === '/api' || pathname.startsWith('/api/')

const getAllowedOrigin = (request: Request): string | undefined => {
  const origin = request.headers.get('Origin')

  if (origin === null) {
    return undefined
  }

  return isAllowedOrigin(origin, new URL(request.url).origin) ? origin : undefined
}

const appendVaryHeaders = (headers: Headers, values: ReadonlyArray<string>) => {
  const existingValues =
    headers
      .get('Vary')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  headers.set('Vary', [...new Set([...existingValues, ...values])].join(', '))
}

const createPreflightResponse = (request: Request): Response | undefined => {
  const requestUrl = new URL(request.url)

  if (
    !isApiPath(requestUrl.pathname) ||
    request.method !== 'OPTIONS' ||
    request.headers.get('Access-Control-Request-Method') === null
  ) {
    return undefined
  }

  const origin = getAllowedOrigin(request)

  if (origin === undefined) {
    return undefined
  }

  const headers = new Headers({
    'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
    'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Origin': origin,
  })
  appendVaryHeaders(headers, PREFLIGHT_VARY_HEADERS)

  return new Response(null, {headers, status: 204})
}

const applyResponseCors = (request: Request, headers: Headers) => {
  appendVaryHeaders(headers, ['Origin'])
  const origin = getAllowedOrigin(request)

  if (origin !== undefined) {
    headers.set('Access-Control-Allow-Origin', origin)
  }
}

export const corsMiddleware = async (
  event: CorsMiddlewareEvent,
  next: NextMiddleware,
): Promise<unknown> => {
  const requestUrl = new URL(event.req.url)

  if (!isApiPath(requestUrl.pathname)) {
    return next()
  }

  const preflightResponse = createPreflightResponse(event.req)

  if (preflightResponse !== undefined) {
    return preflightResponse
  }

  const response = await next()

  if (!(response instanceof Response)) {
    applyResponseCors(event.req, event.res.headers)
    return response
  }

  const headers = new Headers(response.headers)
  applyResponseCors(event.req, headers)

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

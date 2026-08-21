import type {Middleware} from 'h3'

const STATIC_ALLOWED_ORIGINS = new Set([
  'https://pomofi.io',
  'https://www.pomofi.io',
  'https://pomo-app.apps.tossmini.com',
  'https://pomo-app.private-apps.tossmini.com',
  'https://pomo-app.private-web.tossmini.com',
  'https://pomo-app.web.tossmini.com',
])
const DEVELOPMENT_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3100',
  'http://localhost:3200',
  'http://localhost:3300',
  'http://localhost:3400',
])
const VERCEL_HOST_VARIABLES = [
  'VERCEL_URL',
  'VERCEL_BRANCH_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
] as const
const ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']
const ALLOWED_HEADERS = ['Authorization', 'Content-Type', 'Range', 'X-CSRF-Token']
const EXPOSED_HEADERS = [
  'Accept-Ranges',
  'Content-Length',
  'Content-Range',
  'Content-Type',
  'ETag',
  'Last-Modified',
]
const PREFLIGHT_VARY_HEADERS = [
  'Origin',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers',
]
const PREFLIGHT_MAX_AGE = '86400'

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
  if (origin === requestOrigin || STATIC_ALLOWED_ORIGINS.has(origin)) {
    return true
  }

  if (import.meta.env.DEV && DEVELOPMENT_ORIGINS.has(origin)) {
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

const appendVaryHeaders = (headers: Headers, values: ReadonlyArray<string>): void => {
  const existingValues =
    headers
      .get('Vary')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  headers.set('Vary', [...new Set([...existingValues, ...values])].join(', '))
}

const applyAllowedOrigin = (headers: Headers, origin: string): void => {
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS.join(', '))
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
    'Access-Control-Max-Age': PREFLIGHT_MAX_AGE,
  })
  applyAllowedOrigin(headers, origin)
  appendVaryHeaders(headers, PREFLIGHT_VARY_HEADERS)

  return new Response(null, {headers, status: 204})
}

const applyResponseCors = (request: Request, headers: Headers): void => {
  appendVaryHeaders(headers, ['Origin'])
  const origin = getAllowedOrigin(request)

  if (origin !== undefined) {
    applyAllowedOrigin(headers, origin)
  }
}

export const corsMiddleware: Middleware = async (event, next) => {
  const requestUrl = new URL(event.req.url)

  if (!isApiPath(requestUrl.pathname)) {
    return next()
  }

  const preflightResponse = createPreflightResponse(event.req)

  if (preflightResponse !== undefined) {
    return preflightResponse
  }

  applyResponseCors(event.req, event.res.headers)
  applyResponseCors(event.req, event.res.errHeaders)
  const response = await next()

  if (!(response instanceof Response)) {
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

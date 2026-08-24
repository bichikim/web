import {getAdminSession} from '../server/admin-auth/session.ts'

export {classifyAdminAccess, hasAdminRole} from '../server/admin-auth/access.ts'

const ADMIN_PATH = '/admin'
const ADMIN_LOGIN_PATH = '/admin/login'
const SESSION_VERIFIER_PARAM = 'neon_auth_session_verifier'
const HTTP_FORBIDDEN = 403
const HTTP_SERVICE_UNAVAILABLE = 503
const NO_STORE = 'no-store'

interface AdminAuthRequest {
  readonly request: Request
  readonly responseHeaders: Headers
  readonly url: URL
}

export const isProtectedAdminPath = (pathname: string): boolean =>
  (pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`)) &&
  pathname !== ADMIN_LOGIN_PATH

export const getCleanAuthCallbackUrl = (url: URL): URL | null => {
  if (!url.searchParams.has(SESSION_VERIFIER_PARAM)) {
    return null
  }

  const cleanUrl = new URL(url)
  cleanUrl.searchParams.delete(SESSION_VERIFIER_PARAM)
  return cleanUrl
}

const appendCookies = (headers: Headers, cookies: readonly string[]): void => {
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie)
  }
}

const applyAdminSecurityHeaders = (headers: Headers): void => {
  headers.set('Cache-Control', NO_STORE)
  headers.set('Referrer-Policy', 'no-referrer')
}

const createLoginRedirect = (input: AdminAuthRequest, cookies: readonly string[]): Response => {
  const headers = new Headers(input.responseHeaders)
  headers.set('Location', new URL(ADMIN_LOGIN_PATH, input.url).toString())
  appendCookies(headers, cookies)

  return new Response(null, {headers, status: 302})
}

const createCallbackRedirect = (
  input: AdminAuthRequest,
  cookies: readonly string[],
): Response | null => {
  const cleanUrl = getCleanAuthCallbackUrl(input.url)

  if (cleanUrl === null) {
    return null
  }

  const headers = new Headers(input.responseHeaders)
  headers.set('Location', cleanUrl.toString())
  appendCookies(headers, cookies)
  return new Response(null, {headers, status: 302})
}

const createErrorResponse = (
  message: string,
  status: typeof HTTP_FORBIDDEN | typeof HTTP_SERVICE_UNAVAILABLE,
  responseHeaders: Headers,
  cookies: readonly string[] = [],
): Response => {
  const headers = new Headers(responseHeaders)
  appendCookies(headers, cookies)

  return new Response(message, {headers, status})
}

const createUnavailableResponse = (
  input: AdminAuthRequest,
  cookies: readonly string[] = [],
): Response =>
  createErrorResponse(
    'Authentication is unavailable',
    HTTP_SERVICE_UNAVAILABLE,
    input.responseHeaders,
    cookies,
  )

export const handleAdminAuthRequest = async (input: AdminAuthRequest): Promise<Response | null> => {
  if (!isProtectedAdminPath(input.url.pathname)) {
    return null
  }

  applyAdminSecurityHeaders(input.responseHeaders)

  let sessionResult: Awaited<ReturnType<typeof getAdminSession>>

  try {
    sessionResult = await getAdminSession(input.request)
  } catch (error) {
    console.error('Pomo admin authentication is unavailable', error)
    return createUnavailableResponse(input)
  }

  const {access, cookies} = sessionResult

  switch (access) {
    case 'admin': {
      const callbackRedirect = createCallbackRedirect(input, cookies)

      if (callbackRedirect !== null) {
        return callbackRedirect
      }

      appendCookies(input.responseHeaders, cookies)
      return null
    }
    case 'anonymous':
      return createLoginRedirect(input, cookies)
    case 'forbidden': {
      const callbackRedirect = createCallbackRedirect(input, cookies)

      if (callbackRedirect !== null) {
        return callbackRedirect
      }

      return createErrorResponse('Forbidden', HTTP_FORBIDDEN, input.responseHeaders, cookies)
    }
    case 'invalid':
      return createUnavailableResponse(input, cookies)
    default: {
      const exhaustiveAccess: never = access
      return exhaustiveAccess
    }
  }
}

import {handleAuthProxyRequest} from '@neondatabase/auth/server'

import {getNeonAuthProxyConfig} from '../server/auth/environment.ts'

const ADMIN_PATH = '/admin'
const ADMIN_LOGIN_PATH = '/admin/login'
const ADMIN_ROLE = 'admin'
const SESSION_VERIFIER_PARAM = 'neon_auth_session_verifier'
const HTTP_FORBIDDEN = 403
const HTTP_SERVICE_UNAVAILABLE = 503
const NO_STORE = 'no-store'

interface AdminAuthRequest {
  readonly request: Request
  readonly responseHeaders: Headers
  readonly url: URL
}

type AdminAccess = 'admin' | 'anonymous' | 'forbidden' | 'invalid'

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

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

export const hasAdminRole = (role: unknown): boolean => {
  if (typeof role === 'string') {
    return role.split(',').some((value) => value.trim() === ADMIN_ROLE)
  }

  return Array.isArray(role) && role.some((value) => value === ADMIN_ROLE)
}

export const classifyAdminAccess = (sessionData: unknown): AdminAccess => {
  if (sessionData === null) {
    return 'anonymous'
  }

  if (!isRecord(sessionData)) {
    return 'invalid'
  }

  const {session, user} = sessionData

  if (session === null && user === null) {
    return 'anonymous'
  }

  if (!isRecord(session) || !isRecord(user)) {
    return 'invalid'
  }

  return hasAdminRole(user.role) ? 'admin' : 'forbidden'
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

const createSessionRequest = (request: Request): Request => {
  const url = new URL(request.url)
  const headers = new Headers(request.headers)

  url.searchParams.set('disableCookieCache', 'true')
  headers.delete('Content-Length')
  headers.delete('Content-Type')
  headers.delete('Transfer-Encoding')

  return new Request(url, {headers, method: 'GET'})
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

  let sessionResponse: Response

  try {
    sessionResponse = await handleAuthProxyRequest({
      ...getNeonAuthProxyConfig(),
      path: 'get-session',
      request: createSessionRequest(input.request),
    })
  } catch (error) {
    console.error('Pomo admin authentication is unavailable', error)
    return createUnavailableResponse(input)
  }

  const cookies = sessionResponse.headers.getSetCookie()

  if (!sessionResponse.ok) {
    return createUnavailableResponse(input, cookies)
  }

  const access = classifyAdminAccess(await sessionResponse.json().catch(() => undefined))

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

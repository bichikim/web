import {handleAuthProxyRequest} from '@neondatabase/auth/server'

import {getNeonAuthProxyConfig} from '../server/auth/environment'

const ACCOUNT_PATH = '/account'
const SESSION_VERIFIER_PARAM = 'neon_auth_session_verifier'

interface UserAuthRequest {
  readonly request: Request
  readonly responseHeaders: Headers
  readonly url: URL
}

const appendCookies = (headers: Headers, cookies: ReadonlyArray<string>): void => {
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie)
  }
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

export const handleUserAuthRequest = async (input: UserAuthRequest): Promise<Response | null> => {
  if (input.url.pathname !== ACCOUNT_PATH) {
    return null
  }

  input.responseHeaders.set('Cache-Control', 'no-store')
  input.responseHeaders.set('Referrer-Policy', 'no-referrer')

  if (!input.url.searchParams.has(SESSION_VERIFIER_PARAM)) {
    return null
  }

  try {
    const sessionResponse = await handleAuthProxyRequest({
      ...getNeonAuthProxyConfig(),
      path: 'get-session',
      request: createSessionRequest(input.request),
    })

    if (!sessionResponse.ok) {
      appendCookies(input.responseHeaders, sessionResponse.headers.getSetCookie())
      return new Response('Authentication is unavailable', {
        headers: input.responseHeaders,
        status: 503,
      })
    }

    const headers = new Headers(input.responseHeaders)
    const cleanUrl = new URL(input.url)

    cleanUrl.searchParams.delete(SESSION_VERIFIER_PARAM)
    headers.set('Location', cleanUrl.toString())
    appendCookies(headers, sessionResponse.headers.getSetCookie())

    return new Response(null, {headers, status: 302})
  } catch (error) {
    console.error('Pomo user authentication callback failed', error)
    return new Response('Authentication is unavailable', {
      headers: input.responseHeaders,
      status: 503,
    })
  }
}

import {getAuthSession} from 'src/server/auth/get-auth-session'

const ACCOUNT_PATH = '/account'
const ACCOUNT_PATH_WITH_TRAILING_SLASH = `${ACCOUNT_PATH}/`
const ACCOUNT_PATHS: ReadonlySet<string> = new Set([ACCOUNT_PATH, ACCOUNT_PATH_WITH_TRAILING_SLASH])
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

export const handleUserAuthRequest = async (input: UserAuthRequest): Promise<Response | null> => {
  if (!ACCOUNT_PATHS.has(input.url.pathname)) {
    return null
  }

  input.responseHeaders.set('Cache-Control', 'no-store')
  input.responseHeaders.set('Referrer-Policy', 'no-referrer')

  if (!input.url.searchParams.has(SESSION_VERIFIER_PARAM)) {
    return null
  }

  try {
    const sessionResponse = await getAuthSession(input.request, {provider: 'neon'})

    if (sessionResponse.access === 'invalid') {
      appendCookies(input.responseHeaders, sessionResponse.setCookies)
      return new Response('Authentication is unavailable', {
        headers: input.responseHeaders,
        status: 503,
      })
    }

    const headers = new Headers(input.responseHeaders)
    const cleanUrl = new URL(input.url)

    cleanUrl.searchParams.delete(SESSION_VERIFIER_PARAM)
    headers.set('Location', cleanUrl.toString())
    appendCookies(headers, sessionResponse.setCookies)

    return new Response(null, {headers, status: 302})
  } catch (error) {
    console.error('Pomo user authentication callback failed', error)
    return new Response('Authentication is unavailable', {
      headers: input.responseHeaders,
      status: 503,
    })
  }
}

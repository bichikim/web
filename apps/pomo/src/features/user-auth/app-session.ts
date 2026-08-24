const APP_SESSION_STORAGE_KEY = 'pomo:app-session:v1'
const HTTP_UNAUTHORIZED = 401
const HTTP_TOO_MANY_REQUESTS = 429

interface SentAccountLinkEmail {
  readonly status: 'sent'
}

interface RejectedAccountLinkEmail {
  readonly status: 'not-sent'
}

interface RateLimitedAccountLinkEmail {
  readonly retryAfterSeconds: number | null
  readonly status: 'rate-limited'
}

export type AccountLinkEmailResult =
  | SentAccountLinkEmail
  | RejectedAccountLinkEmail
  | RateLimitedAccountLinkEmail

const getApiOrigin = (): string => import.meta.env.POMO_PUBLIC_ORIGIN

const getAuthorizationHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
})

export const readStoredAppSession = async (): Promise<string | null> => {
  const {Storage} = await import('@apps-in-toss/web-framework')
  return Storage.getItem(APP_SESSION_STORAGE_KEY)
}

export const storeAppSession = async (token: string): Promise<void> => {
  const {Storage} = await import('@apps-in-toss/web-framework')
  await Storage.setItem(APP_SESSION_STORAGE_KEY, token)
}

export const clearStoredAppSession = async (): Promise<void> => {
  const {Storage} = await import('@apps-in-toss/web-framework')
  await Storage.removeItem(APP_SESSION_STORAGE_KEY)
}

export const validateAppSession = async (token: string): Promise<boolean> => {
  const response = await fetch(new URL('/api/app-auth/session', getApiOrigin()), {
    headers: getAuthorizationHeaders(token),
  })

  if (response.ok) {
    return true
  }

  if (response.status === HTTP_UNAUTHORIZED) {
    return false
  }

  throw new Error('App session validation failed')
}

export const createTossLoginSession = async (): Promise<string> => {
  const {TossAuth} = await import('@apps-in-toss/web-framework')
  const authorization = await TossAuth.login()
  const response = await fetch(new URL('/api/app-auth/exchange', getApiOrigin()), {
    body: JSON.stringify(authorization),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Toss login exchange failed')
  }

  const body: unknown = await response.json()

  if (
    typeof body !== 'object' ||
    body === null ||
    !('token' in body) ||
    typeof body.token !== 'string'
  ) {
    throw new Error('Toss login returned an invalid session')
  }

  await storeAppSession(body.token)
  return body.token
}

export const revokeTossLoginSession = async (token: string): Promise<void> => {
  const response = await fetch(new URL('/api/app-auth/session', getApiOrigin()), {
    headers: getAuthorizationHeaders(token),
    method: 'DELETE',
  })

  if (!response.ok && response.status !== HTTP_UNAUTHORIZED) {
    throw new Error('App session revocation failed')
  }

  await clearStoredAppSession()
}

export const requestAccountLinkEmail = async (
  token: string,
  email: string,
): Promise<AccountLinkEmailResult> => {
  const response = await fetch(new URL('/api/account/link-email', getApiOrigin()), {
    body: JSON.stringify({email}),
    headers: {
      ...getAuthorizationHeaders(token),
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (response.ok) {
    return {status: 'sent'}
  }

  if (response.status === HTTP_TOO_MANY_REQUESTS) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfterSeconds = Number(retryAfterHeader)

    return {
      retryAfterSeconds:
        retryAfterHeader !== null && Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds
          : null,
      status: 'rate-limited',
    }
  }

  return {status: 'not-sent'}
}

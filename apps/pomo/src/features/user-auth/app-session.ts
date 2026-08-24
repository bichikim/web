import {z} from 'zod'

import {apiJson, ApiJsonError, apiJsonRequest} from '../api-json'
import {apiFetch} from '../http-client'

const APP_SESSION_STORAGE_KEY = 'pomo:app-session:v1'
const HTTP_UNAUTHORIZED = 401
const HTTP_TOO_MANY_REQUESTS = 429
const tossLoginSessionSchema = z.object({token: z.string()})

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
  const response = await apiFetch('app-auth/session', {
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
  let body: z.infer<typeof tossLoginSessionSchema>

  try {
    body = await apiJson('app-auth/exchange', {
      body: authorization,
      method: 'POST',
      responseSchema: tossLoginSessionSchema,
    })
  } catch (error: unknown) {
    if (error instanceof ApiJsonError && error.kind === 'http') {
      throw new Error('Toss login exchange failed', {cause: error})
    }

    if (error instanceof ApiJsonError && error.kind === 'schema') {
      throw new Error('Toss login returned an invalid session', {cause: error})
    }

    throw error
  }

  await storeAppSession(body.token)
  return body.token
}

export const revokeTossLoginSession = async (token: string): Promise<void> => {
  const response = await apiFetch('app-auth/session', {
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
  const response = await apiJsonRequest('account/link-email', {
    body: {email},
    headers: getAuthorizationHeaders(token),
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

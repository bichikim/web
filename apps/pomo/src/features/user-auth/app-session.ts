import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'
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

interface ClearedTossLoginStorage {
  readonly storageStatus: 'cleared'
}

interface PendingTossLoginCleanup {
  readonly storageStatus: 'cleanup-pending'
}

export type AccountLinkEmailResult =
  | SentAccountLinkEmail
  | RejectedAccountLinkEmail
  | RateLimitedAccountLinkEmail

export type RevokeTossLoginSessionResult = ClearedTossLoginStorage | PendingTossLoginCleanup

const getAuthorizationHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
})

export interface AppSessionStorage {
  readonly getItem: (key: string) => Promise<string | null>
  readonly setItem: (key: string, token: string) => Promise<void>
  readonly removeItem: (key: string) => Promise<void>
}

export interface StoredAppSession {
  readonly read: () => Promise<string | null>
  readonly write: (token: string) => Promise<void>
  readonly clear: (token: string) => Promise<void>
}

/** Serializes session mutations and conditionally removes only the supplied token. */
export const createStoredAppSession = (storage: AppSessionStorage): StoredAppSession => {
  const queue = createSerialTaskQueue()
  return {
    clear: (token) =>
      queue.run(async () => {
        if ((await storage.getItem(APP_SESSION_STORAGE_KEY)) === token) {
          await storage.removeItem(APP_SESSION_STORAGE_KEY)
        }
      }),
    read: () => storage.getItem(APP_SESSION_STORAGE_KEY),
    write: (token) => queue.run(() => storage.setItem(APP_SESSION_STORAGE_KEY, token)),
  }
}

const runtimeSession = createStoredAppSession({
  getItem: async (key) => (await import('@apps-in-toss/web-framework')).Storage.getItem(key),
  removeItem: async (key) => (await import('@apps-in-toss/web-framework')).Storage.removeItem(key),
  setItem: async (key, token) =>
    (await import('@apps-in-toss/web-framework')).Storage.setItem(key, token),
})
export const readStoredAppSession = () => runtimeSession.read()
export const storeAppSession = (token: string) => runtimeSession.write(token)
export const clearStoredAppSession = (token: string) => runtimeSession.clear(token)

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

const revokeServerSession = async (token: string): Promise<void> => {
  const response = await apiFetch('app-auth/session', {
    headers: getAuthorizationHeaders(token),
    method: 'DELETE',
  })

  if (!response.ok && response.status !== HTTP_UNAUTHORIZED) {
    throw new Error('App session revocation failed')
  }
}

export const activateStoredSession = async (token: string): Promise<boolean> => {
  const response = await apiFetch('app-auth/session', {
    headers: getAuthorizationHeaders(token),
    method: 'PATCH',
  })

  if (response.ok) {
    return true
  }

  if (response.status === HTTP_UNAUTHORIZED) {
    return false
  }

  throw new Error('App session activation failed')
}

export const createTossLoginSession = async (): Promise<string> => {
  const storedToken = await readStoredAppSession()

  if (storedToken !== null) {
    if (await activateStoredSession(storedToken)) {
      return storedToken
    }

    await clearStoredAppSession(storedToken)
  }

  const {TossAuth} = await import('@apps-in-toss/web-framework')
  const authorization = await TossAuth.login()
  let body: z.infer<typeof tossLoginSessionSchema>

  try {
    body = await apiJson('app-auth/exchange', {
      body: authorization,
      method: 'PUT',
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

  if (!(await activateStoredSession(body.token))) {
    await clearStoredAppSession(body.token)
    throw new Error('App session activation failed')
  }

  return body.token
}

export const revokeTossLoginSession = async (
  token: string,
): Promise<RevokeTossLoginSessionResult> => {
  await revokeServerSession(token)

  try {
    await clearStoredAppSession(token)
    return {storageStatus: 'cleared'}
  } catch (storageError: unknown) {
    console.error('Failed to clear revoked Toss session from storage', storageError)
    return {storageStatus: 'cleanup-pending'}
  }
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

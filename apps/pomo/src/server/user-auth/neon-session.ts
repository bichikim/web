import {handleAuthProxyRequest} from '@neondatabase/auth/server'

import {readNeonAuthProxyConfig} from 'src/server/auth/neon-config'

interface NeonSessionIdentity {
  readonly email: string
  readonly id: string
}

export interface NeonSessionResult {
  readonly cookies: ReadonlyArray<string>
  readonly identity: NeonSessionIdentity | null
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const parseIdentity = (value: unknown): NeonSessionIdentity | null => {
  if (!isRecord(value) || !isRecord(value.user)) {
    return null
  }

  const {email, id} = value.user

  return typeof email === 'string' && typeof id === 'string' ? {email, id} : null
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

export const getNeonSession = async (request: Request): Promise<NeonSessionResult> => {
  const response = await handleAuthProxyRequest({
    ...readNeonAuthProxyConfig(),
    path: 'get-session',
    request: createSessionRequest(request),
  })
  const cookies = response.headers.getSetCookie()

  if (!response.ok) {
    return {cookies, identity: null}
  }

  return {
    cookies,
    identity: parseIdentity(await response.json().catch(() => null)),
  }
}

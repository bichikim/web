import {handleAuthProxyRequest} from '@neondatabase/auth/server'

import {readNeonAuthProxyConfig} from 'src/server/auth/neon-config'
import {classifyAuthAccess} from './classify-auth-access'
import type {NeonIdentity, NeonSession} from './types'

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const parseIdentity = (value: unknown): NeonIdentity | null => {
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

export const getNeonSession = async (request: Request): Promise<NeonSession> => {
  const response = await handleAuthProxyRequest({
    ...readNeonAuthProxyConfig(),
    path: 'get-session',
    request: createSessionRequest(request),
  })
  const setCookies = response.headers.getSetCookie()

  if (!response.ok) {
    return {
      access: 'invalid',
      identity: null,
      provider: 'neon',
      setCookies,
    }
  }

  const data: unknown = await response.json().catch(() => undefined)
  const access = classifyAuthAccess(data)
  const identity = parseIdentity(data)
  return {
    access: identity === null && access !== 'anonymous' ? 'invalid' : access,
    identity,
    provider: 'neon',
    setCookies,
  }
}

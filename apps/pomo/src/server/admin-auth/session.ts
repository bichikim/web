import {handleAuthProxyRequest} from '@neondatabase/auth/server'

import {readNeonAuthProxyConfig} from 'src/server/auth/neon-config'
import {type AdminAccess, classifyAdminAccess} from './access'

export interface AdminSessionResult {
  readonly access: AdminAccess
  readonly cookies: ReadonlyArray<string>
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

export const getAdminSession = async (request: Request): Promise<AdminSessionResult> => {
  const response = await handleAuthProxyRequest({
    ...readNeonAuthProxyConfig(),
    path: 'get-session',
    request: createSessionRequest(request),
  })
  const cookies = response.headers.getSetCookie()

  if (!response.ok) {
    return {access: 'invalid', cookies}
  }

  return {
    access: classifyAdminAccess(await response.json().catch(() => undefined)),
    cookies,
  }
}

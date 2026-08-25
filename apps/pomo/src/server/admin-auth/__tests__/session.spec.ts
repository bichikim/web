import {beforeEach, describe, expect, it, vi} from 'vitest'

interface AuthProxyOptions {
  readonly baseUrl: string
  readonly cookieSecret: string
  readonly path: string
  readonly request: Request
  readonly sameSite: 'lax'
}

const authMocks = vi.hoisted(() => ({
  handleAuthProxyRequest: vi.fn<(options: AuthProxyOptions) => Promise<Response>>(),
}))
const environmentMocks = vi.hoisted(() => ({
  getNeonAuthProxyConfig: vi.fn<() => {baseUrl: string; cookieSecret: string; sameSite: 'lax'}>(),
}))

vi.mock('@neondatabase/auth/server', () => authMocks)
vi.mock('../../auth/environment', () => environmentMocks)

import {getAdminSession} from '../session'

const AUTH_CONFIG = {
  baseUrl: 'https://example.neonauth.aws.neon.tech/neondb/auth',
  cookieSecret: 'a-secure-cookie-secret-with-32-characters',
  sameSite: 'lax',
} as const

beforeEach(() => {
  authMocks.handleAuthProxyRequest.mockReset()
  environmentMocks.getNeonAuthProxyConfig.mockReset().mockReturnValue(AUTH_CONFIG)
})

describe('getAdminSession', () => {
  it('should request a fresh admin session while preserving safe request context', async () => {
    authMocks.handleAuthProxyRequest.mockResolvedValue(
      Response.json(
        {session: {id: 'session-id'}, user: {role: 'admin'}},
        {
          headers: [
            ['Set-Cookie', 'session=updated; Path=/; HttpOnly'],
            ['Set-Cookie', 'challenge=removed; Path=/; Max-Age=0'],
          ],
        },
      ),
    )
    const request = new Request('https://pomo.example/admin?view=music', {
      body: 'ignored body',
      headers: {
        Authorization: 'Bearer admin-token',
        'Content-Length': '12',
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        'X-Request-Context': 'preserved',
      },
      method: 'POST',
    })

    await expect(getAdminSession(request)).resolves.toEqual({
      access: 'admin',
      cookies: ['session=updated; Path=/; HttpOnly', 'challenge=removed; Path=/; Max-Age=0'],
    })
    expect(authMocks.handleAuthProxyRequest).toHaveBeenCalledOnce()
    const proxyOptions = authMocks.handleAuthProxyRequest.mock.calls[0]?.[0]
    expect(proxyOptions).toMatchObject({...AUTH_CONFIG, path: 'get-session'})
    expect(proxyOptions?.request.method).toBe('GET')
    expect(proxyOptions?.request.url).toBe(
      'https://pomo.example/admin?view=music&disableCookieCache=true',
    )
    expect(proxyOptions?.request.headers.get('Authorization')).toBe('Bearer admin-token')
    expect(proxyOptions?.request.headers.get('X-Request-Context')).toBe('preserved')
    expect(proxyOptions?.request.headers.has('Content-Length')).toBe(false)
    expect(proxyOptions?.request.headers.has('Content-Type')).toBe(false)
    expect(proxyOptions?.request.headers.has('Transfer-Encoding')).toBe(false)
  })

  it('should return invalid with upstream cleanup cookies for a failed response', async () => {
    authMocks.handleAuthProxyRequest.mockResolvedValue(
      new Response('Unavailable', {
        headers: {'Set-Cookie': 'challenge=expired; Path=/; Max-Age=0'},
        status: 502,
      }),
    )

    await expect(getAdminSession(new Request('https://pomo.example/admin'))).resolves.toEqual({
      access: 'invalid',
      cookies: ['challenge=expired; Path=/; Max-Age=0'],
    })
  })

  it('should classify an unreadable successful session payload as invalid', async () => {
    authMocks.handleAuthProxyRequest.mockResolvedValue(
      new Response('not JSON', {headers: {'Content-Type': 'application/json'}}),
    )

    await expect(getAdminSession(new Request('https://pomo.example/admin'))).resolves.toEqual({
      access: 'invalid',
      cookies: [],
    })
  })
})

import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({handleAuthProxyRequest: vi.fn()}))

vi.mock('@neondatabase/auth/server', () => authMocks)
vi.mock('../../server/auth/environment.ts', () => ({
  getNeonAuthProxyConfig: () => ({
    baseUrl: 'https://example.neonauth.aws.neon.tech/neondb/auth',
    cookieSecret: 'a-secure-cookie-secret-that-is-long-enough',
    sameSite: 'lax',
  }),
}))

import {handleUserAuthRequest} from '../user-auth'

describe('handleUserAuthRequest', () => {
  beforeEach(() => {
    authMocks.handleAuthProxyRequest.mockReset()
  })

  it('should ignore routes outside the account page', async () => {
    await expect(
      handleUserAuthRequest({
        request: new Request('https://pomo.example/'),
        responseHeaders: new Headers(),
        url: new URL('https://pomo.example/'),
      }),
    ).resolves.toBeNull()
  })

  it.each(['/account', '/account/', '/ko/account/'])(
    'should protect account response %s from caching and referrer leaks',
    async (pathname) => {
      const headers = new Headers()
      const url = new URL(pathname, 'https://pomo.example')

      await expect(
        handleUserAuthRequest({
          request: new Request(url),
          responseHeaders: headers,
          url,
        }),
      ).resolves.toBeNull()
      expect(headers.get('Cache-Control')).toBe('no-store')
      expect(headers.get('Referrer-Policy')).toBe('no-referrer')
    },
  )

  it.each([
    ['/account/', 'https://pomo.example/account/?link_token=challenge'],
    ['/ko/account/', 'https://pomo.example/ko/account/?link_token=challenge'],
  ])('should exchange a verifier on the account route %s', async (pathname, location) => {
    authMocks.handleAuthProxyRequest.mockResolvedValue(
      Response.json(
        {session: {id: 'session'}, user: {id: 'user'}},
        {headers: {'Set-Cookie': 'session=signed; HttpOnly'}},
      ),
    )
    const url = new URL(
      `${pathname}?link_token=challenge&neon_auth_session_verifier=verifier`,
      'https://pomo.example',
    )
    const response = await handleUserAuthRequest({
      request: new Request(url),
      responseHeaders: new Headers(),
      url,
    })

    expect(response?.status).toBe(302)
    expect(response?.headers.get('Cache-Control')).toBe('no-store')
    expect(response?.headers.get('Location')).toBe(location)
  })

  it('should exchange the verifier and remove only that callback parameter', async () => {
    authMocks.handleAuthProxyRequest.mockResolvedValue(
      Response.json(
        {session: {id: 'session'}, user: {id: 'user'}},
        {headers: {'Set-Cookie': 'session=signed; HttpOnly'}},
      ),
    )
    const url = new URL(
      'https://pomo.example/account?link_token=challenge&neon_auth_session_verifier=verifier',
    )
    const response = await handleUserAuthRequest({
      request: new Request(url),
      responseHeaders: new Headers(),
      url,
    })

    expect(response?.status).toBe(302)
    expect(response?.headers.get('Location')).toBe(
      'https://pomo.example/account?link_token=challenge',
    )
    expect(response?.headers.getSetCookie()).toEqual(['session=signed; HttpOnly'])
  })

  it('should keep the verifier available for retry when the exchange fails', async () => {
    authMocks.handleAuthProxyRequest.mockResolvedValue(
      new Response(null, {headers: {'Set-Cookie': 'session=; Max-Age=0'}, status: 502}),
    )
    const url = new URL(
      'https://pomo.example/account?link_token=challenge&neon_auth_session_verifier=verifier',
    )
    const response = await handleUserAuthRequest({
      request: new Request(url),
      responseHeaders: new Headers(),
      url,
    })

    expect(response?.status).toBe(503)
    expect(response?.headers.get('Location')).toBeNull()
    expect(response?.headers.getSetCookie()).toEqual(['session=; Max-Age=0'])
  })

  it('should return a controlled response when the session exchange throws', async () => {
    const error = new Error('Neon Auth unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    authMocks.handleAuthProxyRequest.mockRejectedValue(error)
    const url = new URL('https://pomo.example/account?neon_auth_session_verifier=verifier')

    const response = await handleUserAuthRequest({
      request: new Request(url),
      responseHeaders: new Headers(),
      url,
    })

    expect(response?.status).toBe(503)
    expect(await response?.text()).toBe('Authentication is unavailable')
    expect(consoleError).toHaveBeenCalledWith('Pomo user authentication callback failed', error)
  })
})

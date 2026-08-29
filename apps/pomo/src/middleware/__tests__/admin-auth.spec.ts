import {beforeEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({getAdminSession: vi.fn()}))

vi.mock('../../server/admin-auth/session', () => sessionMocks)

import {
  classifyAdminAccess,
  getCleanAuthCallbackUrl,
  handleAdminAuthRequest,
  hasAdminRole,
  isProtectedAdminPath,
} from '../admin-auth'

beforeEach(() => {
  sessionMocks.getAdminSession.mockReset()
})

it.each([
  ['/admin', true],
  ['/admin/', true],
  ['/admin/albums', true],
  ['/admin/login', false],
  ['/admin/reset-password', true],
  ['/admin-login', false],
  ['/', false],
  ['/feeds/today-in-history/rss.xml', false],
])('should classify %s protection as %s', (pathname, expected) => {
  expect(isProtectedAdminPath(pathname)).toBe(expected)
})

it.each([
  ['admin', true],
  ['user,admin', true],
  ['admin, user', true],
  [['user', 'admin'], true],
  ['user', false],
  ['', false],
  [null, false],
])('should classify role %j admin membership as %s', (role, expected) => {
  expect(hasAdminRole(role)).toBe(expected)
})

it.each([
  [null, 'anonymous'],
  [{session: null, user: null}, 'anonymous'],
  [{session: {id: 'session-id'}, user: {role: 'admin'}}, 'admin'],
  [{session: {id: 'session-id'}, user: {role: 'user'}}, 'forbidden'],
  [{session: {id: 'session-id'}, user: {role: 'user,admin'}}, 'admin'],
  [{session: null, user: {role: 'admin'}}, 'invalid'],
  [{session: {id: 'session-id'}}, 'invalid'],
  [undefined, 'invalid'],
])('should classify session access as %s', (sessionData, expected) => {
  expect(classifyAdminAccess(sessionData)).toBe(expected)
})

it('should remove only the Neon session verifier from the callback URL', () => {
  const callbackUrl = new URL(
    'https://pomo.example/admin?view=albums&neon_auth_session_verifier=secret',
  )

  expect(getCleanAuthCallbackUrl(callbackUrl)?.toString()).toBe(
    'https://pomo.example/admin?view=albums',
  )
  expect(callbackUrl.searchParams.get('neon_auth_session_verifier')).toBe('secret')
})

it('should not redirect a regular admin URL', () => {
  expect(getCleanAuthCallbackUrl(new URL('https://pomo.example/admin'))).toBeNull()
})

it('should ignore an unprotected request without changing response headers', async () => {
  const responseHeaders = new Headers({'X-Existing': 'value'})
  const url = new URL('https://pomo.example/account')

  await expect(
    handleAdminAuthRequest({request: new Request(url), responseHeaders, url}),
  ).resolves.toBeNull()
  expect(sessionMocks.getAdminSession).not.toHaveBeenCalled()
  expect([...responseHeaders]).toEqual([['x-existing', 'value']])
})

it('should allow an admin without caching the protected response', async () => {
  sessionMocks.getAdminSession.mockResolvedValue({
    access: 'admin',
    cookies: ['session-data=signed; Path=/; HttpOnly'],
  })
  const responseHeaders = new Headers()
  const url = new URL('https://pomo.example/admin')

  await expect(
    handleAdminAuthRequest({request: new Request(url), responseHeaders, url}),
  ).resolves.toBeNull()
  expect(responseHeaders.get('Cache-Control')).toBe('no-store')
  expect(responseHeaders.get('Referrer-Policy')).toBe('no-referrer')
  expect(responseHeaders.getSetCookie()).toEqual(['session-data=signed; Path=/; HttpOnly'])
})

it('should clean an admin callback URL while preserving session cookies', async () => {
  sessionMocks.getAdminSession.mockResolvedValue({
    access: 'admin',
    cookies: ['session-data=signed; Path=/; HttpOnly'],
  })
  const responseHeaders = new Headers({'X-Existing': 'value'})
  const url = new URL('https://pomo.example/admin?view=albums&neon_auth_session_verifier=secret')

  const response = await handleAdminAuthRequest({
    request: new Request(url),
    responseHeaders,
    url,
  })

  expect(response?.status).toBe(302)
  expect(response?.headers.get('Location')).toBe('https://pomo.example/admin?view=albums')
  expect(response?.headers.getSetCookie()).toEqual(['session-data=signed; Path=/; HttpOnly'])
  expect(response?.headers.get('Cache-Control')).toBe('no-store')
  expect(response?.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response?.headers.get('X-Existing')).toBe('value')
})

it('should redirect an anonymous visitor to the login page', async () => {
  sessionMocks.getAdminSession.mockResolvedValue({access: 'anonymous', cookies: []})
  const url = new URL('https://pomo.example/admin/albums')

  const response = await handleAdminAuthRequest({
    request: new Request(url),
    responseHeaders: new Headers(),
    url,
  })

  expect(response?.status).toBe(302)
  expect(response?.headers.get('Location')).toBe('https://pomo.example/admin/login')
  expect(response?.headers.get('Cache-Control')).toBe('no-store')
})

it('should keep the session verifier available when session validation is invalid', async () => {
  sessionMocks.getAdminSession.mockResolvedValue({
    access: 'invalid',
    cookies: ['challenge=expired; Path=/; Max-Age=0'],
  })
  const url = new URL('https://pomo.example/admin?view=albums&neon_auth_session_verifier=secret')

  const response = await handleAdminAuthRequest({
    request: new Request(url),
    responseHeaders: new Headers(),
    url,
  })

  expect(response?.status).toBe(503)
  expect(response?.headers.get('Location')).toBeNull()
  expect(response?.headers.getSetCookie()).toEqual(['challenge=expired; Path=/; Max-Age=0'])
})

it('should forbid a signed-in user without the admin role', async () => {
  sessionMocks.getAdminSession.mockResolvedValue({access: 'forbidden', cookies: []})
  const url = new URL('https://pomo.example/admin')

  const response = await handleAdminAuthRequest({
    request: new Request(url),
    responseHeaders: new Headers(),
    url,
  })

  expect(response?.status).toBe(403)
  expect(await response?.text()).toBe('Forbidden')
})

it('should clean a forbidden user callback URL instead of returning a forbidden body', async () => {
  sessionMocks.getAdminSession.mockResolvedValue({
    access: 'forbidden',
    cookies: ['session-data=signed; Path=/; HttpOnly'],
  })
  const url = new URL('https://pomo.example/admin?view=albums&neon_auth_session_verifier=secret')

  const response = await handleAdminAuthRequest({
    request: new Request(url),
    responseHeaders: new Headers(),
    url,
  })

  expect(response?.status).toBe(302)
  expect(response?.headers.get('Location')).toBe('https://pomo.example/admin?view=albums')
  expect(response?.headers.getSetCookie()).toEqual(['session-data=signed; Path=/; HttpOnly'])
  expect(await response?.text()).toBe('')
})

it('should return unavailable when session retrieval throws', async () => {
  const error = new Error('auth provider unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  sessionMocks.getAdminSession.mockRejectedValue(error)
  const responseHeaders = new Headers()
  const url = new URL('https://pomo.example/admin')

  const response = await handleAdminAuthRequest({
    request: new Request(url),
    responseHeaders,
    url,
  })

  expect(response?.status).toBe(503)
  expect(await response?.text()).toBe('Authentication is unavailable')
  expect(response?.headers.getSetCookie()).toEqual([])
  expect(responseHeaders.get('Cache-Control')).toBe('no-store')
  expect(responseHeaders.get('Referrer-Policy')).toBe('no-referrer')
  expect(consoleError).toHaveBeenCalledWith('Pomo admin authentication is unavailable', error)
})

it('should preserve an unexpected access result through the exhaustive fallback', async () => {
  sessionMocks.getAdminSession.mockResolvedValue({access: 'unexpected', cookies: []} as never)
  const url = new URL('https://pomo.example/admin')

  await expect(
    handleAdminAuthRequest({request: new Request(url), responseHeaders: new Headers(), url}),
  ).resolves.toBe('unexpected')
})

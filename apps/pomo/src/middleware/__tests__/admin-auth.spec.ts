import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({handleAuthProxyRequest: vi.fn()}))

vi.mock('@neondatabase/auth/server', () => authMocks)
vi.mock('../../server/auth/environment', () => ({
  getNeonAuthProxyConfig: () => ({
    baseUrl: 'https://example.neonauth.aws.neon.tech/neondb/auth',
    cookieSecret: 'a-secure-cookie-secret-with-32-characters',
    sameSite: 'lax',
  }),
}))

import {
  classifyAdminAccess,
  getCleanAuthCallbackUrl,
  handleAdminAuthRequest,
  hasAdminRole,
  isProtectedAdminPath,
} from '../admin-auth'

beforeEach(() => {
  authMocks.handleAuthProxyRequest.mockReset()
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

it('should allow an admin without caching the protected response', async () => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(
    Response.json(
      {session: {id: 'session-id'}, user: {role: 'admin'}},
      {headers: {'Set-Cookie': 'session-data=signed; Path=/; HttpOnly'}},
    ),
  )
  const responseHeaders = new Headers()
  const url = new URL('https://pomo.example/admin')

  await expect(
    handleAdminAuthRequest({request: new Request(url), responseHeaders, url}),
  ).resolves.toBeNull()
  expect(responseHeaders.get('Cache-Control')).toBe('no-store')
  expect(responseHeaders.get('Referrer-Policy')).toBe('no-referrer')
  expect(responseHeaders.getSetCookie()).toEqual(['session-data=signed; Path=/; HttpOnly'])
})

it('should redirect an anonymous visitor to the login page', async () => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(Response.json(null))
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

it('should keep the session verifier available when the upstream exchange fails', async () => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(
    new Response('Unavailable', {
      headers: {'Set-Cookie': 'challenge=expired; Path=/; Max-Age=0'},
      status: 502,
    }),
  )
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
  authMocks.handleAuthProxyRequest.mockResolvedValue(
    Response.json({session: {id: 'session-id'}, user: {role: 'user'}}),
  )
  const url = new URL('https://pomo.example/admin')

  const response = await handleAdminAuthRequest({
    request: new Request(url),
    responseHeaders: new Headers(),
    url,
  })

  expect(response?.status).toBe(403)
  expect(await response?.text()).toBe('Forbidden')
})

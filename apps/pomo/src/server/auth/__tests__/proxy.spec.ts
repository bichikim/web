import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({handleAuthProxyRequest: vi.fn()}))

vi.mock('@neondatabase/auth/server', () => authMocks)
vi.mock('../environment', () => ({
  getNeonAuthProxyConfig: () => ({
    baseUrl: 'https://example.neonauth.aws.neon.tech/neondb/auth',
    cookieSecret: 'a-secure-cookie-secret-with-32-characters',
    sameSite: 'lax',
  }),
}))

import {handlePomoAuthProxy, isAuthProxyRequestAllowed} from '../proxy'

beforeEach(() => {
  authMocks.handleAuthProxyRequest.mockReset()
})

it.each([
  ['get-session', 'GET'],
  ['magic-link/verify', 'GET'],
  ['sign-in/magic-link', 'POST'],
  ['sign-out', 'POST'],
])('should allow %s with %s', (path, method) => {
  expect(isAuthProxyRequestAllowed(path, method)).toBe(true)
})

it.each([
  ['sign-up/email', 'POST'],
  ['sign-in/email', 'POST'],
  ['admin/create-user', 'POST'],
  ['get-session', 'POST'],
  ['magic-link/verify', 'POST'],
  ['sign-in/magic-link', 'GET'],
  ['sign-out', 'GET'],
])('should reject %s with %s', (path, method) => {
  expect(isAuthProxyRequestAllowed(path, method)).toBe(false)
})

it('should prevent caching and content sniffing for auth responses', async () => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(
    Response.json({session: null, user: null}, {headers: {'Set-Cookie': 'session=; Max-Age=0'}}),
  )

  const response = await handlePomoAuthProxy({
    params: {path: 'get-session'},
    request: new Request('https://pomo.example/api/auth/get-session'),
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Pragma')).toBe('no-cache')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.getSetCookie()).toEqual(['session=; Max-Age=0'])
})

it('should prevent caching for rejected proxy paths', async () => {
  const response = await handlePomoAuthProxy({
    params: {path: 'admin/create-user'},
    request: new Request('https://pomo.example/api/auth/admin/create-user', {method: 'POST'}),
  })

  expect(response.status).toBe(404)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(authMocks.handleAuthProxyRequest).not.toHaveBeenCalled()
})

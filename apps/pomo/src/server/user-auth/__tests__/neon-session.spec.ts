import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({handleAuthProxyRequest: vi.fn()}))

vi.mock('@neondatabase/auth/server', () => authMocks)
vi.mock('../../auth/environment', () => ({
  getNeonAuthProxyConfig: () => ({baseUrl: 'https://auth.example', cookieSecret: 'secret'}),
}))

import {getNeonSession} from '../neon-session'

beforeEach(() => {
  vi.clearAllMocks()
})

const createResponse = (body: BodyInit | null, status = 200): Response => {
  const headers = new Headers()
  headers.append('Set-Cookie', 'session=refreshed; Path=/')
  return new Response(body, {headers, status})
}

it('should request a fresh session without entity headers', async () => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(
    createResponse(JSON.stringify({user: {email: 'user@example.com', id: 'user-1'}})),
  )
  const request = new Request('https://pomo.example/api/account?source=web', {
    body: '{}',
    headers: {
      'Content-Length': '2',
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'X-Request-Id': 'request-1',
    },
    method: 'POST',
  })

  await expect(getNeonSession(request)).resolves.toEqual({
    cookies: ['session=refreshed; Path=/'],
    identity: {email: 'user@example.com', id: 'user-1'},
  })
  const input = authMocks.handleAuthProxyRequest.mock.calls[0]?.[0]
  expect(input).toMatchObject({baseUrl: 'https://auth.example', path: 'get-session'})
  expect(input.request.method).toBe('GET')
  expect(input.request.url).toBe(
    'https://pomo.example/api/account?source=web&disableCookieCache=true',
  )
  expect(input.request.headers.get('Content-Length')).toBeNull()
  expect(input.request.headers.get('Content-Type')).toBeNull()
  expect(input.request.headers.get('Transfer-Encoding')).toBeNull()
  expect(input.request.headers.get('X-Request-Id')).toBe('request-1')
})

it('should preserve cookies and ignore an unsuccessful session response', () => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(createResponse('unauthorized', 401))

  return expect(getNeonSession(new Request('https://pomo.example/account'))).resolves.toEqual({
    cookies: ['session=refreshed; Path=/'],
    identity: null,
  })
})

it.each([
  ['a non-object payload', 'null'],
  ['a payload without a user record', JSON.stringify({user: null})],
  ['a user without a string email', JSON.stringify({user: {email: 1, id: 'user-1'}})],
  ['a user without a string id', JSON.stringify({user: {email: 'user@example.com', id: 1}})],
])('should ignore %s', (_label, body) => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(createResponse(body))

  return expect(getNeonSession(new Request('https://pomo.example/account'))).resolves.toMatchObject(
    {
      identity: null,
    },
  )
})

it('should ignore an invalid JSON session payload', () => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(createResponse('{'))

  return expect(getNeonSession(new Request('https://pomo.example/account'))).resolves.toMatchObject(
    {
      identity: null,
    },
  )
})

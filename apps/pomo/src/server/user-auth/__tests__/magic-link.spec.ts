import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({handleAuthProxyRequest: vi.fn()}))

vi.mock('@neondatabase/auth/server', () => authMocks)
vi.mock('src/server/auth/neon-config', () => ({
  readNeonAuthProxyConfig: () => ({baseUrl: 'https://auth.example', cookieSecret: 'secret'}),
}))

import {sendAccountLinkEmail} from '../magic-link'

beforeEach(() => {
  vi.clearAllMocks()
})

it.each([
  [true, 200],
  [false, 400],
])('should return %s for a proxy response with status %i', async (expected, status) => {
  authMocks.handleAuthProxyRequest.mockResolvedValue(new Response(null, {status}))
  const request = new Request('https://pomo.example/api/account/link-email')

  await expect(
    sendAccountLinkEmail({challengeToken: 'challenge-1', email: 'user@example.com', request}),
  ).resolves.toBe(expected)

  const input = authMocks.handleAuthProxyRequest.mock.calls[0]?.[0]
  expect(input).toMatchObject({
    baseUrl: 'https://auth.example',
    cookieSecret: 'secret',
    path: 'sign-in/magic-link',
  })
  expect(input.request.method).toBe('POST')
  expect(input.request.url).toBe('https://pomo.example/api/auth/sign-in/magic-link')
  expect(input.request.headers.get('Content-Type')).toBe('application/json')
  expect(input.request.headers.get('Origin')).toBe('https://pomo.example')
  await expect(input.request.json()).resolves.toEqual({
    callbackURL: 'https://pomo.example/account?link_token=challenge-1',
    email: 'user@example.com',
    errorCallbackURL: 'https://pomo.example/account?link_error=email',
  })
})

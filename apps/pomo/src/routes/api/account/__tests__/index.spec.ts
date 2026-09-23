/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({getAuthSession: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({findOrCreateNeonUser: vi.fn()}))

vi.mock('src/server/auth/get-auth-session', () => sessionMocks)
vi.mock('src/server/repositories/auth', () => repositoryMocks)

import {GET} from '../index'
import {invokeApiRoute} from '../../__tests__/invoke'

beforeEach(() => {
  vi.clearAllMocks()
})

it('should return an unauthorized response with refreshed session cookies', async () => {
  sessionMocks.getAuthSession.mockResolvedValue({
    access: 'anonymous',
    identity: null,
    provider: 'neon',
    setCookies: ['session=; Max-Age=0'],
  })

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/account'))

  expect(response.status).toBe(401)
  expect(response.headers.getSetCookie()).toEqual(['session=; Max-Age=0'])
  await expect(response.json()).resolves.toEqual({authenticated: false})
  expect(repositoryMocks.findOrCreateNeonUser).not.toHaveBeenCalled()
})

it('should report when the Neon session is invalid', async () => {
  sessionMocks.getAuthSession.mockResolvedValue({
    access: 'invalid',
    identity: null,
    provider: 'neon',
    setCookies: ['session=refreshed'],
  })

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/account'))

  expect(response.status).toBe(503)
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  await expect(response.json()).resolves.toEqual({error: 'authentication_unavailable'})
  expect(repositoryMocks.findOrCreateNeonUser).not.toHaveBeenCalled()
})

it('should return the linked Pomo user for an authenticated Neon identity', async () => {
  sessionMocks.getAuthSession.mockResolvedValue({
    access: 'user',
    identity: {email: 'user@example.com', id: 'neon-1'},
    provider: 'neon',
    setCookies: ['session=refreshed'],
  })
  repositoryMocks.findOrCreateNeonUser.mockResolvedValue('pomo-1')

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/account'))

  expect(response.status).toBe(200)
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  await expect(response.json()).resolves.toEqual({
    authenticated: true,
    email: 'user@example.com',
    userId: 'pomo-1',
  })
  expect(repositoryMocks.findOrCreateNeonUser).toHaveBeenCalledWith('neon-1')
})

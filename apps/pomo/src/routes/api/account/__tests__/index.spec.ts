import {beforeEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({getNeonSession: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({findOrCreateNeonUser: vi.fn()}))

vi.mock('src/server/user-auth/neon-session', () => sessionMocks)
vi.mock('src/server/user-auth/repository', () => repositoryMocks)

import {GET} from '../index'
import {invokeApiRoute} from '../../__tests__/invoke'

beforeEach(() => {
  vi.clearAllMocks()
})

it('should return an unauthorized response with refreshed session cookies', async () => {
  sessionMocks.getNeonSession.mockResolvedValue({cookies: ['session=; Max-Age=0'], identity: null})

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/account'))

  expect(response.status).toBe(401)
  expect(response.headers.getSetCookie()).toEqual(['session=; Max-Age=0'])
  await expect(response.json()).resolves.toEqual({authenticated: false})
  expect(repositoryMocks.findOrCreateNeonUser).not.toHaveBeenCalled()
})

it('should return the linked Pomo user for an authenticated Neon identity', async () => {
  sessionMocks.getNeonSession.mockResolvedValue({
    cookies: ['session=refreshed'],
    identity: {email: 'user@example.com', id: 'neon-1'},
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

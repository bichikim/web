/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({getAuthSession: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({findOrCreateNeonUser: vi.fn()}))

vi.mock('src/server/auth/get-auth-session', () => sessionMocks)
vi.mock('src/server/repositories/auth', () => repositoryMocks)

import {GET} from '../routes/api/account/index'
import {invokeApiRoute} from '../routes/api/__tests__/invoke'

beforeEach(() => {
  vi.clearAllMocks()
})

it('should return a JSON service-unavailable response when user provisioning fails', async () => {
  sessionMocks.getAuthSession.mockResolvedValue({
    access: 'user',
    identity: {email: 'user@example.com', id: 'neon-1'},
    provider: 'neon',
    setCookies: ['session=refreshed'],
  })
  repositoryMocks.findOrCreateNeonUser.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/account'))

  expect(response.status).toBe(503)
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  await expect(response.json()).resolves.toEqual({error: 'authentication_unavailable'})
})

import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  authenticateUserRequest: vi.fn(),
  beginConnection: vi.fn(),
  getCalendarService: vi.fn(),
}))

vi.mock('src/server/user-auth/request', () => ({
  authenticateUserRequest: dependencyMocks.authenticateUserRequest,
}))
vi.mock('src/server/calendar/runtime', () => ({
  getCalendarService: dependencyMocks.getCalendarService,
}))

import {POST} from '../[provider]'

const createEvent = (provider: string): APIEvent =>
  ({
    params: {provider},
    request: new Request(`https://www.pomofi.io/api/calendar/connect/${provider}`, {
      method: 'POST',
    }),
  }) as unknown as APIEvent

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.authenticateUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})
  dependencyMocks.getCalendarService.mockReturnValue({
    beginConnection: dependencyMocks.beginConnection,
  })
  dependencyMocks.beginConnection.mockResolvedValue('https://accounts.google.com/authorize')
})

it('should reject an unsupported provider', async () => {
  const response = await POST(createEvent('apple'))

  expect(response.status).toBe(400)
  expect(dependencyMocks.authenticateUserRequest).not.toHaveBeenCalled()
})

it('should create an authorization URL for the authenticated user', async () => {
  const response = await POST(createEvent('google'))

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    authorizationUrl: 'https://accounts.google.com/authorize',
  })
  expect(dependencyMocks.beginConnection).toHaveBeenCalledWith({
    provider: 'google',
    redirectUri: 'https://www.pomofi.io/api/calendar/callback/google',
    userId: 'user-1',
  })
})

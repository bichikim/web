/** @vitest-environment node */
import type {APIEvent} from '@solidjs/start/server'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {UserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
const dependencyMocks = vi.hoisted(() => ({
  beginConnection: vi.fn(),
  getCalendarService: vi.fn(),
  resolveUserRequest: vi.fn(),
}))

vi.mock('src/server/auth/resolve-user-request', () => ({
  resolveUserRequest: dependencyMocks.resolveUserRequest,
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
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: [],
    userId: 'user-1',
  })
  dependencyMocks.getCalendarService.mockReturnValue({
    beginConnection: dependencyMocks.beginConnection,
  })
  dependencyMocks.beginConnection.mockResolvedValue('https://accounts.google.com/authorize')
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should reject an unsupported provider', async () => {
  const response = await POST(createEvent('apple'))

  expect(response.status).toBe(400)
  expect(dependencyMocks.resolveUserRequest).not.toHaveBeenCalled()
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

it('should report when the Neon session is invalid', async () => {
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    access: 'invalid',
    cookies: ['session=refreshed'],
    userId: null,
  })

  const response = await POST(createEvent('google'))

  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({error: 'authentication_unavailable'})
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  expect(dependencyMocks.beginConnection).not.toHaveBeenCalled()
})

it('should preserve refreshed cookies when user resolution fails', async () => {
  const error = new Error('user mapping down')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  dependencyMocks.resolveUserRequest.mockRejectedValue(
    new UserRequestResolutionError(['session=refreshed'], error),
  )

  const response = await POST(createEvent('google'))

  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({error: 'calendar_connection_unavailable'})
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  expect(consoleError).toHaveBeenCalledWith('Failed to resolve calendar user', error)
})

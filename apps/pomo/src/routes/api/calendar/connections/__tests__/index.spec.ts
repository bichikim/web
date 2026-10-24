/** @vitest-environment node */
import type {APIEvent} from '@solidjs/start/server'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {UserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
const dependencyMocks = vi.hoisted(() => ({
  listConnections: vi.fn(),
  resolveUserRequest: vi.fn(),
}))

vi.mock('src/server/auth/resolve-user-request', () => ({
  resolveUserRequest: dependencyMocks.resolveUserRequest,
}))
vi.mock('src/server/calendar/runtime', () => ({
  listCalendarConnections: dependencyMocks.listConnections,
}))

import {GET} from '../index'

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: [],
    userId: 'user-1',
  })
  dependencyMocks.listConnections.mockResolvedValue([
    {accountLabel: 'person@example.com', id: 'connection-1', provider: 'google'},
  ])
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should list calendar accounts without returning stored tokens', async () => {
  const response = await GET({
    request: new Request('https://www.pomofi.io/api/calendar/connections'),
  } as APIEvent)

  await expect(response.json()).resolves.toEqual({
    connections: [{accountLabel: 'person@example.com', id: 'connection-1', provider: 'google'}],
  })
  expect(dependencyMocks.listConnections).toHaveBeenCalledWith('user-1')
})

it('should report when the Neon session is invalid', async () => {
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    access: 'invalid',
    cookies: ['session=refreshed'],
    userId: null,
  })

  const response = await GET({
    request: new Request('https://www.pomofi.io/api/calendar/connections'),
  } as APIEvent)

  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({error: 'authentication_unavailable'})
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  expect(dependencyMocks.listConnections).not.toHaveBeenCalled()
})

it('should preserve refreshed cookies when user resolution fails', async () => {
  const error = new Error('user mapping down')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  dependencyMocks.resolveUserRequest.mockRejectedValue(
    new UserRequestResolutionError(['session=refreshed'], error),
  )

  const response = await GET({
    request: new Request('https://www.pomofi.io/api/calendar/connections'),
  } as APIEvent)

  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({error: 'calendar_connections_unavailable'})
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  expect(consoleError).toHaveBeenCalledWith('Failed to resolve calendar user', error)
})

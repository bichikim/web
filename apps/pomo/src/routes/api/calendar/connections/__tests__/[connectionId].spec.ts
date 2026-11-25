/** @vitest-environment node */
import type {APIEvent} from '@solidjs/start/server'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {UserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
const dependencyMocks = vi.hoisted(() => ({
  deleteConnection: vi.fn(),
  resolveUserRequest: vi.fn(),
}))

vi.mock('src/server/auth/resolve-user-request', () => ({
  resolveUserRequest: dependencyMocks.resolveUserRequest,
}))
vi.mock('src/server/calendar/runtime', () => ({
  deleteCalendarConnection: dependencyMocks.deleteConnection,
}))

import {DELETE} from '../[connectionId]'

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: [],
    userId: 'user-1',
  })
  dependencyMocks.deleteConnection.mockResolvedValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should delete only the authenticated user connection', async () => {
  const response = await DELETE({
    params: {connectionId: '00000000-0000-4000-8000-000000000001'},
    request: new Request(
      'https://www.pomofi.io/api/calendar/connections/00000000-0000-4000-8000-000000000001',
      {
        method: 'DELETE',
      },
    ),
  } as unknown as APIEvent)

  expect(response.status).toBe(204)
  expect(dependencyMocks.deleteConnection).toHaveBeenCalledWith(
    'user-1',
    '00000000-0000-4000-8000-000000000001',
  )
})

it('should report when the Neon session is invalid', async () => {
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    access: 'invalid',
    cookies: ['session=refreshed'],
    userId: null,
  })

  const response = await DELETE({
    params: {connectionId: 'connection-1'},
    request: new Request('https://www.pomofi.io/api/calendar/connections/connection-1', {
      method: 'DELETE',
    }),
  } as unknown as APIEvent)

  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({error: 'authentication_unavailable'})
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  expect(dependencyMocks.deleteConnection).not.toHaveBeenCalled()
})

it('should preserve refreshed cookies when user resolution fails', async () => {
  const error = new Error('user mapping down')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  dependencyMocks.resolveUserRequest.mockRejectedValue(
    new UserRequestResolutionError(['session=refreshed'], error),
  )

  const response = await DELETE({
    params: {connectionId: 'connection-1'},
    request: new Request('https://www.pomofi.io/api/calendar/connections/connection-1', {
      method: 'DELETE',
    }),
  } as unknown as APIEvent)

  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({error: 'calendar_connection_unavailable'})
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  expect(consoleError).toHaveBeenCalledWith('Failed to resolve calendar user', error)
})

it('should reject a malformed connection id before attempting deletion', async () => {
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: ['session=refreshed'],
    userId: 'user-1',
  })
  dependencyMocks.deleteConnection.mockRejectedValue(
    new Error('invalid input syntax for type uuid'),
  )
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const response = await DELETE({
    params: {connectionId: 'invalid'},
    request: new Request('https://www.pomofi.io/api/calendar/connections/invalid', {
      method: 'DELETE',
    }),
  } as unknown as APIEvent)

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({error: 'invalid_request'})
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  expect(dependencyMocks.deleteConnection).not.toHaveBeenCalled()
  expect(consoleError).not.toHaveBeenCalled()
})

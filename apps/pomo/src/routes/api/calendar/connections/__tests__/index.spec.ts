import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  authenticateUserRequest: vi.fn(),
  listConnections: vi.fn(),
}))

vi.mock('src/server/user-auth/request', () => ({
  authenticateUserRequest: dependencyMocks.authenticateUserRequest,
}))
vi.mock('src/server/calendar/runtime', () => ({
  listCalendarConnections: dependencyMocks.listConnections,
}))

import {GET} from '../index'

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.authenticateUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})
  dependencyMocks.listConnections.mockResolvedValue([
    {accountLabel: 'person@example.com', id: 'connection-1', provider: 'google'},
  ])
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

import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  authenticateUserRequest: vi.fn(),
  deleteConnection: vi.fn(),
}))

vi.mock('src/server/user-auth/request', () => ({
  authenticateUserRequest: dependencyMocks.authenticateUserRequest,
}))
vi.mock('src/server/calendar/runtime', () => ({
  deleteCalendarConnection: dependencyMocks.deleteConnection,
}))

import {DELETE} from '../[connectionId]'

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.authenticateUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})
  dependencyMocks.deleteConnection.mockResolvedValue(true)
})

it('should delete only the authenticated user connection', async () => {
  const response = await DELETE({
    params: {connectionId: 'connection-1'},
    request: new Request('https://www.pomofi.io/api/calendar/connections/connection-1', {
      method: 'DELETE',
    }),
  } as unknown as APIEvent)

  expect(response.status).toBe(204)
  expect(dependencyMocks.deleteConnection).toHaveBeenCalledWith('user-1', 'connection-1')
})

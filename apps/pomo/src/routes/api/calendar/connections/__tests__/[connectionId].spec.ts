/** @vitest-environment node */
import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

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
  dependencyMocks.resolveUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})
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

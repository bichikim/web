import {beforeEach, expect, it, vi} from 'vitest'

import {authenticateUserRequest} from '../request'

const dependencyMocks = vi.hoisted(() => ({
  authenticateAppRequest: vi.fn(),
  findOrCreateNeonUser: vi.fn(),
  getNeonSession: vi.fn(),
}))

vi.mock('../http', () => ({authenticateAppRequest: dependencyMocks.authenticateAppRequest}))
vi.mock('../neon-session', () => ({getNeonSession: dependencyMocks.getNeonSession}))
vi.mock('../repository', () => ({findOrCreateNeonUser: dependencyMocks.findOrCreateNeonUser}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('should use the bearer app session without reading the web session', async () => {
  dependencyMocks.authenticateAppRequest.mockResolvedValue({token: 'token', userId: 'app-user'})

  await expect(
    authenticateUserRequest(
      new Request('https://pomofi.io/api/calendar/events', {
        headers: {Authorization: 'Bearer token'},
      }),
    ),
  ).resolves.toEqual({cookies: [], userId: 'app-user'})
  expect(dependencyMocks.getNeonSession).not.toHaveBeenCalled()
})

it('should resolve a web identity and preserve refreshed cookies', async () => {
  dependencyMocks.getNeonSession.mockResolvedValue({
    cookies: ['session=refreshed'],
    identity: {email: 'person@example.com', id: 'neon-subject'},
  })
  dependencyMocks.findOrCreateNeonUser.mockResolvedValue('web-user')

  await expect(
    authenticateUserRequest(new Request('https://pomofi.io/api/calendar/events')),
  ).resolves.toEqual({cookies: ['session=refreshed'], userId: 'web-user'})
})

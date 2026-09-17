/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {resolveUserRequest} from '../resolve-user-request'

const mocks = vi.hoisted(() => ({findOrCreateNeonUser: vi.fn(), getAuthSession: vi.fn()}))
vi.mock('src/server/auth/get-auth-session', () => ({
  getAuthSession: mocks.getAuthSession,
}))
vi.mock('../../repositories/auth', () => ({findOrCreateNeonUser: mocks.findOrCreateNeonUser}))

beforeEach(() => vi.resetAllMocks())

it.each(['app-user', null])(
  'should preserve the Toss identity without creating a web user (%s)',
  async (userId) => {
    mocks.getAuthSession.mockResolvedValue({provider: 'toss', setCookies: [], userId})
    await expect(
      resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
    ).resolves.toEqual({cookies: [], userId})
    expect(mocks.findOrCreateNeonUser).not.toHaveBeenCalled()
  },
)

it('should resolve a Neon identity and preserve refreshed cookies', async () => {
  mocks.getAuthSession.mockResolvedValue({
    identity: {email: 'person@example.com', id: 'neon-user'},
    provider: 'neon',
    setCookies: ['session=refreshed'],
  })
  mocks.findOrCreateNeonUser.mockResolvedValue('pomo-user')
  await expect(
    resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
  ).resolves.toEqual({cookies: ['session=refreshed'], userId: 'pomo-user'})
  expect(mocks.findOrCreateNeonUser).toHaveBeenCalledWith('neon-user')
})

it('should preserve refreshed cookies when creating a Neon user fails', async () => {
  const error = new Error('database unavailable')
  mocks.getAuthSession.mockResolvedValue({
    identity: {email: 'person@example.com', id: 'neon-user'},
    provider: 'neon',
    setCookies: ['session=refreshed'],
  })
  mocks.findOrCreateNeonUser.mockRejectedValue(error)

  await expect(
    resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
  ).rejects.toMatchObject({cause: error, cookies: ['session=refreshed']})
})

it('should preserve anonymous cookies without creating a user', async () => {
  mocks.getAuthSession.mockResolvedValue({
    identity: null,
    provider: 'neon',
    setCookies: ['session=; Max-Age=0'],
  })
  await expect(
    resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
  ).resolves.toEqual({cookies: ['session=; Max-Age=0'], userId: null})
  expect(mocks.findOrCreateNeonUser).not.toHaveBeenCalled()
})

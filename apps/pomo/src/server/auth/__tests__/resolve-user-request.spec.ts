/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {resolveUserRequest} from '../resolve-user-request'

const mocks = vi.hoisted(() => ({findOrCreateNeonUser: vi.fn(), getAuthSession: vi.fn()}))
vi.mock('src/server/auth/get-auth-session', () => ({
  getAuthSession: mocks.getAuthSession,
}))
vi.mock('../../repositories/auth', () => ({findOrCreateNeonUser: mocks.findOrCreateNeonUser}))

beforeEach(() => vi.resetAllMocks())

it.each([
  ['app-user', 'user'],
  [null, 'anonymous'],
] as const)(
  'should preserve the Toss identity without creating a web user (%s)',
  async (userId, access) => {
    mocks.getAuthSession.mockResolvedValue({access, provider: 'toss', setCookies: [], userId})
    await expect(
      resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
    ).resolves.toEqual({access, cookies: [], userId})
    expect(mocks.findOrCreateNeonUser).not.toHaveBeenCalled()
  },
)

it('should resolve a Neon identity and preserve refreshed cookies', async () => {
  mocks.getAuthSession.mockResolvedValue({
    access: 'user',
    identity: {email: 'person@example.com', id: 'neon-user'},
    provider: 'neon',
    setCookies: ['session=refreshed'],
  })
  mocks.findOrCreateNeonUser.mockResolvedValue('pomo-user')
  await expect(
    resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
  ).resolves.toEqual({access: 'user', cookies: ['session=refreshed'], userId: 'pomo-user'})
  expect(mocks.findOrCreateNeonUser).toHaveBeenCalledWith('neon-user')
})

it('should preserve an invalid Neon session without creating a user', async () => {
  mocks.getAuthSession.mockResolvedValue({
    access: 'invalid',
    identity: null,
    provider: 'neon',
    setCookies: ['session=refreshed'],
  })

  await expect(
    resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
  ).resolves.toEqual({access: 'invalid', cookies: ['session=refreshed'], userId: null})
  expect(mocks.findOrCreateNeonUser).not.toHaveBeenCalled()
})

it('should preserve refreshed cookies when creating a Neon user fails', async () => {
  const error = new Error('database unavailable')
  mocks.getAuthSession.mockResolvedValue({
    access: 'user',
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
    access: 'anonymous',
    identity: null,
    provider: 'neon',
    setCookies: ['session=; Max-Age=0'],
  })
  await expect(
    resolveUserRequest(new Request('https://pomo.example/api/calendar/events')),
  ).resolves.toEqual({
    access: 'anonymous',
    cookies: ['session=; Max-Age=0'],
    userId: null,
  })
  expect(mocks.findOrCreateNeonUser).not.toHaveBeenCalled()
})

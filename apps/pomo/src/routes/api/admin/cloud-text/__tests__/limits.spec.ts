/** @vitest-environment node */
import type {AdminCloudTextUser} from 'src/features/admin-cloud-text/contracts'
import {beforeEach, expect, it, vi} from 'vitest'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {listAdminCloudTextUsers} from 'src/server/cloud-text/admin/list-users'
import {updateUserCloudTextLimit} from 'src/server/cloud-text/admin/update-limit'
import {invokeApiRoute} from '../../../__tests__/invoke'
import {PATCH} from '../[userId]/index'

vi.mock('src/server/auth/authorize-admin-request', () => ({authorizeAdminRequest: vi.fn()}))
vi.mock('src/server/cloud-text/admin/list-users', () => ({listAdminCloudTextUsers: vi.fn()}))
vi.mock('src/server/cloud-text/admin/update-limit', () => ({updateUserCloudTextLimit: vi.fn()}))
const userId = '00000000-0000-4000-8000-000000000001'
const user: AdminCloudTextUser = {
  createdAt: '2026-10-07T00:00:00.000Z',
  dailyLimitOverride: 5,
  id: userId,
  providers: ['neon'],
  usage: {day: '2026-10-07', limit: 5, remaining: 4, resetsAt: '2026-10-07T15:00:00.000Z', used: 1},
}
const request = (dailyLimit: unknown = 5) =>
  new Request(`https://pomo.example/api/admin/cloud-text/${userId}`, {
    body: JSON.stringify({dailyLimit}),
    headers: {'Content-Type': 'application/json'},
    method: 'PATCH',
  })
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({authorized: true, cookies: ['admin=1']})
  vi.mocked(updateUserCloudTextLimit).mockResolvedValue(true)
  vi.mocked(listAdminCloudTextUsers).mockResolvedValue({nextCursor: null, users: [user]})
})
it('should reject ordinary users before changing any limit', async () => {
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    authorized: false,
    response: Response.json({error: 'forbidden'}, {status: 403}),
  })
  expect((await invokeApiRoute(PATCH, request(), {userId})).status).toBe(403)
  expect(updateUserCloudTextLimit).not.toHaveBeenCalled()
})
it('should reject negative or fractional limits before writes', async () => {
  expect((await invokeApiRoute(PATCH, request(-1), {userId})).status).toBe(400)
  expect((await invokeApiRoute(PATCH, request(1.5), {userId})).status).toBe(400)
  expect(updateUserCloudTextLimit).not.toHaveBeenCalled()
})
it('should update the user and return authoritative usage without caching', async () => {
  const response = await invokeApiRoute(PATCH, request(), {userId})
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(response.headers.getSetCookie()).toEqual(['admin=1'])
  expect(updateUserCloudTextLimit).toHaveBeenCalledWith({dailyLimit: 5, userId})
  await expect(response.json()).resolves.toEqual(user)
})
it('should restore the default when the admin sends null', async () => {
  expect((await invokeApiRoute(PATCH, request(null), {userId})).status).toBe(200)
  expect(updateUserCloudTextLimit).toHaveBeenCalledWith({dailyLimit: null, userId})
})
it('should return 404 for missing or deleted users', async () => {
  vi.mocked(updateUserCloudTextLimit).mockResolvedValue(false)
  expect((await invokeApiRoute(PATCH, request(), {userId})).status).toBe(404)
})

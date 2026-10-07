/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {ADMIN_USER} from 'src/features/admin-cloud-text/__tests__/fixtures/user'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {listAdminCloudTextUsers} from 'src/server/cloud-text/admin/list-users'
import {resetUserCloudTextUsage} from 'src/server/cloud-text/admin/reset-usage'
import {invokeApiRoute} from '../../../__tests__/invoke'
import {POST} from '../[userId]/reset'

vi.mock('src/server/auth/authorize-admin-request', () => ({authorizeAdminRequest: vi.fn()}))
vi.mock('src/server/cloud-text/admin/list-users', () => ({listAdminCloudTextUsers: vi.fn()}))
vi.mock('src/server/cloud-text/admin/reset-usage', () => ({resetUserCloudTextUsage: vi.fn()}))
const request = () =>
  new Request(`https://pomo.example/api/admin/cloud-text/${ADMIN_USER.id}/reset`, {method: 'POST'})
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({authorized: true, cookies: ['admin=1']})
  vi.mocked(resetUserCloudTextUsage).mockResolvedValue(true)
  vi.mocked(listAdminCloudTextUsers).mockResolvedValue({nextCursor: null, users: [ADMIN_USER]})
})
it('should reject ordinary users before resetting any usage', async () => {
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    authorized: false,
    response: Response.json({error: 'forbidden'}, {status: 403}),
  })
  expect((await invokeApiRoute(POST, request(), {userId: ADMIN_USER.id})).status).toBe(403)
  expect(resetUserCloudTextUsage).not.toHaveBeenCalled()
})
it('should reject malformed user IDs before writing', async () => {
  expect((await invokeApiRoute(POST, request(), {userId: 'invalid'})).status).toBe(400)
  expect(resetUserCloudTextUsage).not.toHaveBeenCalled()
})
it('should reset usage and return authoritative values without caching', async () => {
  const response = await invokeApiRoute(POST, request(), {userId: ADMIN_USER.id})
  expect(response.status).toBe(200)
  expect(resetUserCloudTextUsage).toHaveBeenCalledWith({userId: ADMIN_USER.id})
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(response.headers.getSetCookie()).toEqual(['admin=1'])
  expect(await response.json()).toEqual(ADMIN_USER)
})
it('should return not found for missing or deleted users', async () => {
  vi.mocked(resetUserCloudTextUsage).mockResolvedValue(false)
  expect((await invokeApiRoute(POST, request(), {userId: ADMIN_USER.id})).status).toBe(404)
  expect(listAdminCloudTextUsers).not.toHaveBeenCalled()
})

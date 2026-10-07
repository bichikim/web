/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {listAdminCloudTextUsers} from 'src/server/cloud-text/admin/list-users'
import {invokeApiRoute} from '../../../__tests__/invoke'
import {GET} from '../index'
vi.mock('src/server/auth/authorize-admin-request', () => ({authorizeAdminRequest: vi.fn()}))
vi.mock('src/server/cloud-text/admin/list-users', () => ({listAdminCloudTextUsers: vi.fn()}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({authorized: true, cookies: ['admin=1']})
  vi.mocked(listAdminCloudTextUsers).mockResolvedValue({nextCursor: null, users: []})
})
it('should reject non-admin reads without exposing users or usage', async () => {
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    authorized: false,
    response: Response.json({error: 'forbidden'}, {status: 403}),
  })
  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/admin/cloud-text'),
  )
  expect(response.status).toBe(403)
  expect(listAdminCloudTextUsers).not.toHaveBeenCalled()
})
it('should validate UUID filters before querying users', async () => {
  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/admin/cloud-text?userId=invalid'),
  )
  expect(response.status).toBe(400)
  expect(listAdminCloudTextUsers).not.toHaveBeenCalled()
})
it('should return private paginated usage with refreshed admin cookies', async () => {
  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/admin/cloud-text'),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(response.headers.getSetCookie()).toEqual(['admin=1'])
  await expect(response.json()).resolves.toEqual({nextCursor: null, users: []})
})

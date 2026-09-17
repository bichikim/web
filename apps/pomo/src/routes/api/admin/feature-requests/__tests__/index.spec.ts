/** @vitest-environment node */

import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({listAdminFeatureRequests: vi.fn()}))

vi.mock('src/server/auth/authorize-admin-request', () => authMocks)
vi.mock('src/server/repositories/feature-requests', () => repositoryMocks)

import {GET} from '../index'
import {invokeApiRoute} from '../../../__tests__/invoke'

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.authorizeAdminRequest.mockResolvedValue({authorized: true, cookies: ['admin=1']})
  repositoryMocks.listAdminFeatureRequests.mockResolvedValue([])
})

it('should return the authorization response before listing requests', async () => {
  authMocks.authorizeAdminRequest.mockResolvedValue({
    authorized: false,
    response: Response.json({error: 'forbidden'}, {status: 403}),
  })

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/admin/feature-requests'),
  )

  expect(response.status).toBe(403)
  expect(repositoryMocks.listAdminFeatureRequests).not.toHaveBeenCalled()
})

it('should list all feature requests for an administrator', async () => {
  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/admin/feature-requests'),
  )

  expect(response.status).toBe(200)
  expect(response.headers.getSetCookie()).toEqual(['admin=1'])
  await expect(response.json()).resolves.toEqual({requests: []})
})

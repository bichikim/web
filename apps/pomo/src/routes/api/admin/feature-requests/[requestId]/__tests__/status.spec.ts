/** @vitest-environment node */

import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({updateFeatureRequestStatus: vi.fn()}))

vi.mock('src/server/auth/authorize-admin-request', () => authMocks)
vi.mock('src/server/repositories/feature-requests', () => repositoryMocks)

import {PATCH} from '../status'
import {invokeApiRoute} from '../../../../__tests__/invoke'

const REQUEST_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'

const createRequest = (body: unknown): Request =>
  new Request(`https://pomo.example/api/admin/feature-requests/${REQUEST_ID}`, {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'PATCH',
  })

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.authorizeAdminRequest.mockResolvedValue({authorized: true, cookies: []})
  repositoryMocks.updateFeatureRequestStatus.mockResolvedValue({success: true})
})

it('should require administrator authorization before changing status', async () => {
  authMocks.authorizeAdminRequest.mockResolvedValue({
    authorized: false,
    response: Response.json({error: 'forbidden'}, {status: 403}),
  })

  const response = await invokeApiRoute(
    PATCH,
    createRequest({status: 'voting', targetVoteCount: 10}),
    {requestId: REQUEST_ID},
  )

  expect(response.status).toBe(403)
  expect(repositoryMocks.updateFeatureRequestStatus).not.toHaveBeenCalled()
})

it('should update the status and target vote count through the repository', async () => {
  const response = await invokeApiRoute(
    PATCH,
    createRequest({status: 'voting', targetVoteCount: 10}),
    {requestId: REQUEST_ID},
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({status: 'updated'})
  expect(repositoryMocks.updateFeatureRequestStatus).toHaveBeenCalledWith({
    requestId: REQUEST_ID,
    status: 'voting',
    targetVoteCount: 10,
  })
})

it('should expose a missing request as not found', async () => {
  repositoryMocks.updateFeatureRequestStatus.mockResolvedValue({
    code: 'feature_request_not_found',
    success: false,
  })

  const response = await invokeApiRoute(PATCH, createRequest({status: 'completed'}), {
    requestId: REQUEST_ID,
  })

  expect(response.status).toBe(404)
})

it('should reject a voting state without a positive target', async () => {
  const response = await invokeApiRoute(
    PATCH,
    createRequest({status: 'voting', targetVoteCount: 0}),
    {requestId: REQUEST_ID},
  )

  expect(response.status).toBe(400)
  expect(repositoryMocks.updateFeatureRequestStatus).not.toHaveBeenCalled()
})

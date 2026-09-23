/** @vitest-environment node */

import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({
  isUserRequestResolutionError: vi.fn(() => false),
  resolveUserRequest: vi.fn(),
}))
const repositoryMocks = vi.hoisted(() => ({voteFeatureRequest: vi.fn()}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/repositories/feature-requests', () => repositoryMocks)

import {POST} from '../vote'
import {invokeApiRoute} from '../../../__tests__/invoke'

const REQUEST_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})
  repositoryMocks.voteFeatureRequest.mockResolvedValue({status: 'voted'})
})

it('should reject a vote before writing when the visitor is anonymous', async () => {
  authMocks.resolveUserRequest.mockResolvedValue({cookies: [], userId: null})

  const response = await invokeApiRoute(
    POST,
    new Request(`https://pomo.example/api/feature-requests/${REQUEST_ID}/vote`, {method: 'POST'}),
    {requestId: REQUEST_ID},
  )

  expect(response.status).toBe(401)
  expect(repositoryMocks.voteFeatureRequest).not.toHaveBeenCalled()
})

it('should add one idempotent vote for the resolved user', async () => {
  const response = await invokeApiRoute(
    POST,
    new Request(`https://pomo.example/api/feature-requests/${REQUEST_ID}/vote`, {method: 'POST'}),
    {requestId: REQUEST_ID},
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({status: 'voted'})
  expect(repositoryMocks.voteFeatureRequest).toHaveBeenCalledWith(REQUEST_ID, 'user-1')
})

it('should expose a closed request as a conflict', async () => {
  repositoryMocks.voteFeatureRequest.mockResolvedValue({status: 'closed'})

  const response = await invokeApiRoute(
    POST,
    new Request(`https://pomo.example/api/feature-requests/${REQUEST_ID}/vote`, {method: 'POST'}),
    {requestId: REQUEST_ID},
  )

  expect(response.status).toBe(409)
  await expect(response.json()).resolves.toEqual({error: 'feature_request_voting_closed'})
})

it('should reject an invalid request identifier', async () => {
  const response = await invokeApiRoute(
    POST,
    new Request('https://pomo.example/api/feature-requests/not-a-uuid/vote', {method: 'POST'}),
    {requestId: 'not-a-uuid'},
  )

  expect(response.status).toBe(400)
  expect(repositoryMocks.voteFeatureRequest).not.toHaveBeenCalled()
})

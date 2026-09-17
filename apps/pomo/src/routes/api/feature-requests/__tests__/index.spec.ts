/** @vitest-environment node */

import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({
  isUserRequestResolutionError: vi.fn(() => false),
  resolveUserRequest: vi.fn(),
}))
const repositoryMocks = vi.hoisted(() => ({
  createFeatureRequest: vi.fn(),
  listFeatureRequests: vi.fn(),
}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/repositories/feature-requests', () => repositoryMocks)

import {GET, POST} from '../index'
import {invokeApiRoute} from '../../__tests__/invoke'

const REQUEST = {
  createdAt: '2026-09-17T01:00:00.000Z',
  description: '집중 세션을 더 쉽게 이어가고 싶어요.',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  status: 'requested',
  targetVoteCount: null,
  title: '집중 세션 통계',
  voteCount: 2,
  votedByCurrentUser: false,
} as const

const createRequest = (body: unknown): Request =>
  new Request('https://pomo.example/api/feature-requests', {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({cookies: [], userId: null})
  repositoryMocks.listFeatureRequests.mockResolvedValue([REQUEST])
  repositoryMocks.createFeatureRequest.mockResolvedValue({id: REQUEST.id})
})

it('should list feature requests for an anonymous visitor', async () => {
  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/feature-requests'),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({requests: [REQUEST]})
  expect(repositoryMocks.listFeatureRequests).toHaveBeenCalledWith(null)
})

it('should require an authenticated user before creating a request', async () => {
  const response = await invokeApiRoute(POST, createRequest({description: '', title: '새 기능'}))

  expect(response.status).toBe(401)
  expect(repositoryMocks.createFeatureRequest).not.toHaveBeenCalled()
})

it('should create a feature request for the resolved user', async () => {
  authMocks.resolveUserRequest.mockResolvedValue({cookies: ['session=refreshed'], userId: 'user-1'})

  const response = await invokeApiRoute(
    POST,
    createRequest({description: '집중 기록을 보고 싶어요.', title: '집중 세션 통계'}),
  )

  expect(response.status).toBe(201)
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  await expect(response.json()).resolves.toEqual({id: REQUEST.id, status: 'created'})
  expect(repositoryMocks.createFeatureRequest).toHaveBeenCalledWith({
    description: '집중 기록을 보고 싶어요.',
    title: '집중 세션 통계',
    userId: 'user-1',
  })
})

it('should reject invalid request content before writing', async () => {
  authMocks.resolveUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})

  const response = await invokeApiRoute(POST, createRequest({description: '', title: ''}))

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({error: 'invalid_request'})
  expect(repositoryMocks.createFeatureRequest).not.toHaveBeenCalled()
})

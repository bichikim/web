/** @vitest-environment node */

import {beforeEach, expect, it, vi} from 'vitest'

const apiMocks = vi.hoisted(() => ({
  apiJson: vi.fn(),
  apiJsonRequest: vi.fn(),
  parseJsonResponse: vi.fn(),
}))
const sessionMocks = vi.hoisted(() => ({readStoredAppSession: vi.fn()}))

vi.mock('../../api-json', () => apiMocks)
vi.mock('../../user-auth/app-session', () => sessionMocks)

import {
  createFeatureRequest,
  listAdminFeatureRequests,
  listFeatureRequests,
  updateAdminFeatureRequest,
  voteFeatureRequest,
} from '../api'

const REQUEST_PAGE = {hasMore: false, requests: []}

beforeEach(() => {
  vi.clearAllMocks()
  apiMocks.apiJson.mockResolvedValue(REQUEST_PAGE)
  apiMocks.apiJsonRequest.mockResolvedValue(new Response(null, {status: 200}))
  apiMocks.parseJsonResponse.mockResolvedValue({status: 'voted'})
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
})

it('should list public and admin requests with pagination options', async () => {
  await listFeatureRequests()
  await listFeatureRequests({offset: 12})
  await listAdminFeatureRequests({offset: 24})

  expect(apiMocks.apiJson).toHaveBeenNthCalledWith(
    1,
    'feature-requests',
    expect.objectContaining({credentials: 'include', responseSchema: expect.anything()}),
  )
  expect(apiMocks.apiJson).toHaveBeenNthCalledWith(
    2,
    'feature-requests?offset=12',
    expect.objectContaining({credentials: 'include', responseSchema: expect.anything()}),
  )
  expect(apiMocks.apiJson).toHaveBeenNthCalledWith(
    3,
    'admin/feature-requests?offset=24',
    expect.objectContaining({credentials: 'include', responseSchema: expect.anything()}),
  )
})

it('should classify feature request creation responses', async () => {
  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 401}))
  await expect(createFeatureRequest({description: '', title: '새 기능'})).resolves.toEqual({
    status: 'unauthorized',
  })

  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 400}))
  await expect(createFeatureRequest({description: '', title: '새 기능'})).resolves.toEqual({
    status: 'invalid',
  })

  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 201}))
  await expect(createFeatureRequest({description: '설명', title: '새 기능'})).resolves.toEqual({
    status: 'created',
  })
})

it('should classify votes and parse a successful vote response', async () => {
  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 401}))
  await expect(voteFeatureRequest('request-1')).resolves.toEqual({status: 'unauthorized'})

  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 404}))
  await expect(voteFeatureRequest('request-1')).resolves.toEqual({status: 'not-found'})

  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 409}))
  await expect(voteFeatureRequest('request-1')).resolves.toEqual({status: 'closed'})

  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 200}))
  await expect(voteFeatureRequest('request/1')).resolves.toEqual({status: 'voted'})
  expect(apiMocks.apiJsonRequest).toHaveBeenLastCalledWith(
    'feature-requests/request%2F1/vote',
    expect.objectContaining({method: 'POST'}),
  )
  expect(apiMocks.parseJsonResponse).toHaveBeenCalledOnce()
})

it('should classify administrator status updates', async () => {
  const input = {requestId: 'request-1', status: 'voting' as const, targetVoteCount: 10}

  const statusCases = [
    [400, {status: 'invalid'}],
    [409, {status: 'conflict'}],
    [404, {status: 'not-found'}],
  ] as const
  for (const [status] of statusCases) {
    apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status}))
  }
  await expect(
    Promise.all(statusCases.map(([, result]) => updateAdminFeatureRequest(input))),
  ).resolves.toEqual(statusCases.map(([, result]) => result))

  apiMocks.apiJsonRequest.mockResolvedValueOnce(new Response(null, {status: 200}))
  await expect(updateAdminFeatureRequest(input)).resolves.toEqual({status: 'updated'})
  expect(apiMocks.apiJsonRequest).toHaveBeenLastCalledWith(
    'admin/feature-requests/request-1/status',
    expect.objectContaining({
      body: {status: 'voting', targetVoteCount: 10},
      credentials: 'include',
      method: 'PATCH',
    }),
  )
})

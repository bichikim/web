/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest} from '../features/feature-requests/types'

const apiMocks = vi.hoisted(() => ({
  createFeatureRequest: vi.fn(),
  listFeatureRequests: vi.fn(),
  voteFeatureRequest: vi.fn(),
}))

vi.mock('../features/feature-requests/api', () => apiMocks)

import {useFeatureRequests} from '../features/feature-requests/use-feature-requests'

const createRequest = (id: string, voteCount = 0): FeatureRequest => ({
  createdAt: '2026-09-17T01:00:00.000Z',
  description: '설명',
  id,
  status: 'requested',
  targetVoteCount: null,
  title: `요청 ${id}`,
  voteCount,
  votedByCurrentUser: false,
})

const REQUEST_A = createRequest('019d1990-1dc9-7255-a7b5-f9459dfaf782', 2)
const REQUEST_B = createRequest('019d1990-1dc9-7255-a7b5-f9459dfaf783', 1)
const REQUEST_C = createRequest('019d1990-1dc9-7255-a7b5-f9459dfaf784', 0)

beforeEach(() => {
  vi.clearAllMocks()
})

it('should not append stale loadMore results after a concurrent refresh resets the list', async () => {
  const stalePage = Promise.withResolvers<{
    hasMore: boolean
    requests: ReadonlyArray<FeatureRequest>
  }>()

  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST_A]})
    .mockReturnValueOnce(stalePage.promise)
    .mockResolvedValueOnce({
      hasMore: false,
      requests: [{...REQUEST_A, voteCount: 99}, REQUEST_B, REQUEST_C],
    })

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  const loadMore = result.loadMore()
  await waitFor(() => expect(result.isLoadingMore()).toBe(true))

  apiMocks.voteFeatureRequest.mockResolvedValueOnce({status: 'voted'})
  await result.voteRequest(REQUEST_A.id)
  stalePage.resolve({hasMore: false, requests: [REQUEST_B]})

  await loadMore
  await waitFor(() => expect(result.isLoadingMore()).toBe(false))

  const requests = result.requests()
  const ids = requests.map((request) => request.id)
  expect(requests).toHaveLength(3)
  expect(ids).toEqual([REQUEST_A.id, REQUEST_B.id, REQUEST_C.id])
  expect(new Set(ids).size).toBe(3)
  cleanup()
})

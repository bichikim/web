/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest, FeatureRequestPage} from '../features/feature-requests/types'

const apiMocks = vi.hoisted(() => ({
  createFeatureRequest: vi.fn(),
  listFeatureRequests: vi.fn(),
  voteFeatureRequest: vi.fn(),
}))

vi.mock('../features/feature-requests/api', () => apiMocks)

import {useFeatureRequests} from '../features/feature-requests/use-feature-requests'

const createRequest = (id: string, title: string): FeatureRequest => ({
  createdAt: '2026-09-17T01:00:00.000Z',
  description: '설명',
  id,
  status: 'requested',
  targetVoteCount: null,
  title,
  voteCount: 1,
  votedByCurrentUser: false,
})

const PAGE_ONE = Array.from({length: 20}, (_, index) =>
  createRequest(`page-one-${index}`, `요청 ${index + 1}`),
)
const PAGE_TWO = [
  createRequest('page-two-0', '요청 21'),
  createRequest('page-two-1', '요청 22'),
]

beforeEach(() => {
  vi.clearAllMocks()
})

it('should keep every loaded page after voting on a later page item', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: PAGE_ONE})
    .mockResolvedValueOnce({hasMore: false, requests: PAGE_TWO})
    .mockResolvedValueOnce({hasMore: false, requests: PAGE_ONE})
  apiMocks.voteFeatureRequest.mockResolvedValue({status: 'voted'})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.requests()).toHaveLength(22)

  await result.voteRequest('page-two-0')

  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(3)
  expect(result.requests()).toHaveLength(22)
  expect(result.requests().map((request) => request.id)).toEqual([
    ...PAGE_ONE.map((request) => request.id),
    ...PAGE_TWO.map((request) => request.id),
  ])

  cleanup()
})

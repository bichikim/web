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

const REQUEST: FeatureRequest = {
  createdAt: '2026-09-17T01:00:00.000Z',
  description: '설명',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  status: 'requested',
  targetVoteCount: null,
  title: '새 기능',
  voteCount: 2,
  votedByCurrentUser: false,
}
const NEXT_REQUEST: FeatureRequest = {
  ...REQUEST,
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
  title: '두 번째 기능',
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should keep appended pages after creating a feature request', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
  apiMocks.createFeatureRequest.mockResolvedValue({status: 'created'})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)

  await result.createRequest({description: '상세 설명', title: '새 요청'})

  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(3)
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)

  cleanup()
})

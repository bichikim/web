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

beforeEach(() => {
  vi.clearAllMocks()
})

it('should keep a successful vote visible when refresh completes after voting', async () => {
  const voteResponse = Promise.withResolvers<{status: 'voted'}>()
  const refreshResponse = Promise.withResolvers<FeatureRequestPage>()
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: false, requests: [REQUEST]})
    .mockReturnValueOnce(refreshResponse.promise)
  apiMocks.voteFeatureRequest.mockReturnValueOnce(voteResponse.promise)

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  const votePromise = result.voteRequest(REQUEST.id)
  const refreshPromise = result.refresh()

  voteResponse.resolve({status: 'voted'})
  await votePromise

  expect(result.requests()).toEqual([
    {...REQUEST, voteCount: REQUEST.voteCount + 1, votedByCurrentUser: true},
  ])

  refreshResponse.resolve({hasMore: false, requests: [REQUEST]})
  await refreshPromise

  expect(result.requests()).toEqual([
    {...REQUEST, voteCount: REQUEST.voteCount + 1, votedByCurrentUser: true},
  ])
  cleanup()
})

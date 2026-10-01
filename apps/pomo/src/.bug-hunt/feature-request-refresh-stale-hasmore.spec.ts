/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest} from '../features/feature-requests/types'

const apiMocks = vi.hoisted(() => ({
  listFeatureRequests: vi.fn(),
}))

vi.mock('../features/feature-requests/api', () => ({
  createFeatureRequest: vi.fn(),
  listFeatureRequests: apiMocks.listFeatureRequests,
  voteFeatureRequest: vi.fn(),
}))

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
const NEXT_REQUEST = {...REQUEST, id: '019d1990-1dc9-7255-a7b5-f9459dfaf783'}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should apply refreshed hasMore false after loadMore left hasMore true', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [REQUEST]})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  expect(result.hasMore()).toBe(true)

  await result.loadMore()
  expect(result.hasMore()).toBe(true)

  await result.refresh()

  expect(result.hasMore()).toBe(false)
  cleanup()
})

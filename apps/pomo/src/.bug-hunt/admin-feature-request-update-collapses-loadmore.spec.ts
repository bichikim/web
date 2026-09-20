/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest} from 'src/features/feature-requests/types'

const apiMocks = vi.hoisted(() => ({
  listAdminFeatureRequests: vi.fn(),
  updateAdminFeatureRequest: vi.fn(),
}))

vi.mock('src/features/feature-requests/api', () => apiMocks)

import {useAdminFeatureRequests} from 'src/features/feature-requests/use-admin-feature-requests'

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

it('should keep appended admin pages after a successful status update', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])

  await result.updateRequest({
    requestId: REQUEST.id,
    status: 'voting',
    targetVoteCount: 10,
  })

  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)

  cleanup()
})

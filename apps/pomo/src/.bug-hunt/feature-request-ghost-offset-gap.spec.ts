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

const REQUEST_A: FeatureRequest = {
  createdAt: '2026-09-17T01:00:00.000Z',
  description: 'A',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf781',
  status: 'requested',
  targetVoteCount: null,
  title: 'Request A',
  voteCount: 1,
  votedByCurrentUser: false,
}
const REQUEST_B: FeatureRequest = {
  ...REQUEST_A,
  description: 'B',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  title: 'Request B',
}
const REQUEST_C: FeatureRequest = {
  ...REQUEST_A,
  description: 'C',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
  title: 'Request C',
}

const paginate = (
  items: ReadonlyArray<FeatureRequest>,
  offset = 0,
  pageSize = 1,
): FeatureRequestPage => {
  const page = items.slice(offset, offset + pageSize)
  return {hasMore: offset + pageSize < items.length, requests: page}
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should not skip server rows when a deleted ghost entry inflates the loadMore offset', async () => {
  let serverItems: ReadonlyArray<FeatureRequest> = [REQUEST_A, REQUEST_B, REQUEST_C]

  apiMocks.listFeatureRequests.mockImplementation(async ({offset = 0} = {}) =>
    paginate(serverItems, offset),
  )

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.requests()).toEqual([REQUEST_A, REQUEST_B])

  serverItems = [REQUEST_A, REQUEST_C]
  await result.refresh()
  expect(result.requests()).toEqual([REQUEST_A, REQUEST_B])

  await result.loadMore()

  expect(apiMocks.listFeatureRequests).toHaveBeenLastCalledWith({offset: 2})
  expect(result.requests()).toEqual([REQUEST_A, REQUEST_B, REQUEST_C])
  expect(result.hasMore()).toBe(false)

  cleanup()
})

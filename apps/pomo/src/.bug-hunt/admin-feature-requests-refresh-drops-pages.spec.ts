/** @vitest-environment jsdom */

// Bug: apps/pomo/src/features/feature-requests/use-admin-feature-requests.ts (refresh(), ~lines 40-58)
//
// `refresh()` always does `setRequests(page.requests)`, replacing the entire list with just the
// freshly fetched first page. Unlike the sibling `useFeatureRequests` hook (which explicitly
// preserves pages appended via `loadMore()` across a refresh -- see
// "should base the next offset on the refreshed server page instead of preserved ghosts" and
// "should keep loaded pages after refreshing before creating a feature request" in
// use-feature-requests.spec.ts), `useAdminFeatureRequests.refresh()` has no such preservation.
//
// AdminFeatureRequests.tsx wires this `refresh()` directly to a manual "새로고침" (refresh) button.
// An admin who has paged through several pages of feature requests and then clicks refresh loses
// every page beyond the first, even though those items may still exist on the server.

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
const NEXT_REQUEST = {...REQUEST, id: '019d1990-1dc9-7255-a7b5-f9459dfaf783'}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should keep already-loaded pages visible when an admin refreshes after loading more', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])

  await result.refresh()

  // BUG: this currently fails -- NEXT_REQUEST (loaded via loadMore) disappears because
  // refresh() unconditionally replaces `requests` with only the just-fetched first page.
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])

  cleanup()
})

/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest} from '../types'

const apiMocks = vi.hoisted(() => ({
  listAdminFeatureRequests: vi.fn(),
  updateAdminFeatureRequest: vi.fn(),
}))

vi.mock('../api', () => apiMocks)

import {useAdminFeatureRequests} from '../use-admin-feature-requests'

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

it('should load and append administrator request pages', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()

  expect(apiMocks.listAdminFeatureRequests).toHaveBeenNthCalledWith(2, {offset: 1})
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should refresh after a successful status update and expose failures', async () => {
  apiMocks.listAdminFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValueOnce({status: 'updated'})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  const input = {requestId: REQUEST.id, status: 'voting' as const, targetVoteCount: 10}
  await expect(result.updateRequest(input)).resolves.toEqual({status: 'updated'})
  expect(apiMocks.updateAdminFeatureRequest).toHaveBeenCalledWith(input)
  expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledTimes(2)
  expect(result.updatingRequestId()).toBeNull()

  apiMocks.updateAdminFeatureRequest.mockRejectedValueOnce(new Error('update failed'))
  await expect(result.updateRequest(input)).resolves.toEqual({status: 'unavailable'})
  expect(result.updatingRequestId()).toBeNull()
  cleanup()
})

it('should expose loading failures and ignore pagination without another page', async () => {
  apiMocks.listAdminFeatureRequests.mockRejectedValueOnce(new Error('load failed'))

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.loadFailed()).toBe(true))

  await result.loadMore()

  expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledOnce()
  cleanup()
})

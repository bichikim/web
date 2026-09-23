/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest, FeatureRequestPage} from '../types'

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

it('should keep loaded pages visible after refreshing the first page', async () => {
  const refreshedRequest = {...REQUEST, title: '새로 고침된 기능'}
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [refreshedRequest]})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])

  await result.refresh()

  expect(result.requests()).toEqual([refreshedRequest, NEXT_REQUEST])
  cleanup()
})

it('should use the refreshed server page length for the next offset', async () => {
  const ghostRequest = {...REQUEST, id: '019d1990-1dc9-7255-a7b5-f9459dfaf784'}
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [ghostRequest]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.refresh()
  await result.loadMore()

  expect(apiMocks.listAdminFeatureRequests).toHaveBeenNthCalledWith(4, {offset: 1})
  expect(result.requests()).toEqual([REQUEST, ghostRequest, NEXT_REQUEST])
  cleanup()
})

it('should preserve loaded pages and pagination when refreshing fails', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockRejectedValueOnce(new Error('refresh failed'))

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.refresh()

  expect(result.loadFailed()).toBe(true)
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(true)
  cleanup()
})

it('should ignore a load more response that started before refresh', async () => {
  const loadMoreResponse = Promise.withResolvers<FeatureRequestPage>()
  const refreshResponse = Promise.withResolvers<FeatureRequestPage>()
  const refreshedRequest = {...REQUEST, title: '새로 고침된 기능'}
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(loadMoreResponse.promise)
    .mockReturnValueOnce(refreshResponse.promise)

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  const loadMorePromise = result.loadMore()
  await waitFor(() => expect(result.isLoadingMore()).toBe(true))

  const refreshPromise = result.refresh()
  expect(result.isLoading()).toBe(true)

  refreshResponse.resolve({hasMore: true, requests: [refreshedRequest]})
  await refreshPromise
  loadMoreResponse.resolve({hasMore: false, requests: [NEXT_REQUEST]})
  await loadMorePromise

  expect(result.requests()).toEqual([refreshedRequest])
  expect(result.hasMore()).toBe(true)
  expect(result.isLoadingMore()).toBe(false)
  expect(result.loadMoreFailed()).toBe(false)
  cleanup()
})

it('should update a request in place without collapsing appended pages', async () => {
  const updatedRequest = {...NEXT_REQUEST, status: 'voting' as const, targetVoteCount: 10}
  const input = {requestId: NEXT_REQUEST.id, status: 'voting' as const, targetVoteCount: 10}
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValueOnce({status: 'updated'})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await expect(result.updateRequest(input)).resolves.toEqual({status: 'updated'})

  expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledTimes(2)
  expect(result.requests()).toEqual([REQUEST, updatedRequest])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should update status without another list request and expose failures', async () => {
  apiMocks.listAdminFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValueOnce({status: 'updated'})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  const input = {requestId: REQUEST.id, status: 'voting' as const, targetVoteCount: 10}
  await expect(result.updateRequest(input)).resolves.toEqual({status: 'updated'})
  expect(apiMocks.updateAdminFeatureRequest).toHaveBeenCalledWith(input)
  expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledOnce()
  expect(result.requests()).toEqual([{...REQUEST, status: 'voting', targetVoteCount: 10}])
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

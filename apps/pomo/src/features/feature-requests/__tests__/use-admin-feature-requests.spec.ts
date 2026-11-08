/** @vitest-environment jsdom */

import {MemoryRouter, query} from '@solidjs/router'
import {renderHook, waitFor} from '@solidjs/testing-library'
import {createComponent, type ParentComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest, FeatureRequestPage} from '../types'

const RouterWrapper: ParentComponent = (props) =>
  createComponent(MemoryRouter, {root: () => props.children})

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
  query.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should keep another request marked as updating when the first save completes', async () => {
  const firstSave = Promise.withResolvers<{status: 'updated'}>()
  const secondSave = Promise.withResolvers<{status: 'updated'}>()
  apiMocks.listAdminFeatureRequests.mockResolvedValue({
    hasMore: false,
    requests: [REQUEST, NEXT_REQUEST],
  })
  apiMocks.updateAdminFeatureRequest
    .mockReturnValueOnce(firstSave.promise)
    .mockReturnValueOnce(secondSave.promise)
  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  const first = result.updateRequest({requestId: REQUEST.id, status: 'voting', targetVoteCount: 10})
  const second = result.updateRequest({
    requestId: NEXT_REQUEST.id,
    status: 'voting',
    targetVoteCount: 10,
  })
  expect(result.isUpdatingRequest(REQUEST.id)).toBe(true)
  expect(result.isUpdatingRequest(NEXT_REQUEST.id)).toBe(true)
  firstSave.resolve({status: 'updated'})
  await first
  expect(result.isUpdatingRequest(REQUEST.id)).toBe(false)
  expect(result.isUpdatingRequest(NEXT_REQUEST.id)).toBe(true)
  secondSave.resolve({status: 'updated'})
  await second
  expect(result.isUpdatingRequest(NEXT_REQUEST.id)).toBe(false)
  cleanup()
})

it('should reject a duplicate save while the same request is updating', async () => {
  const saveResponse = Promise.withResolvers<{status: 'updated'}>()
  apiMocks.listAdminFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockReturnValueOnce(saveResponse.promise)
  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  const input = {requestId: REQUEST.id, status: 'voting' as const, targetVoteCount: 10}
  const first = result.updateRequest(input)
  await expect(result.updateRequest(input)).resolves.toEqual({status: 'conflict'})
  expect(apiMocks.updateAdminFeatureRequest).toHaveBeenCalledOnce()
  expect(result.isUpdatingRequest(REQUEST.id)).toBe(true)
  saveResponse.resolve({status: 'updated'})
  await first
  cleanup()
})

it('should load and append administrator request pages', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])

  await result.refresh()

  expect(result.requests()).toEqual([refreshedRequest, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should adopt hasMore false after a manual refresh and keep loaded pages', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [REQUEST]})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.hasMore()).toBe(true)

  await result.refresh()

  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should use the refreshed server page length for the next offset', async () => {
  const ghostRequest = {...REQUEST, id: '019d1990-1dc9-7255-a7b5-f9459dfaf784'}
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [ghostRequest]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  const loadMorePromise = result.loadMore()
  await waitFor(() => expect(result.isLoadingMore()).toBe(true))

  const refreshPromise = result.refresh()
  expect(result.isLoading()).toBe(true)

  refreshResponse.resolve({hasMore: false, requests: [refreshedRequest]})
  await refreshPromise
  loadMoreResponse.resolve({hasMore: true, requests: [NEXT_REQUEST]})
  await loadMorePromise

  expect(result.requests()).toEqual([refreshedRequest])
  expect(result.hasMore()).toBe(false)
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

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  const input = {requestId: REQUEST.id, status: 'voting' as const, targetVoteCount: 10}
  await expect(result.updateRequest(input)).resolves.toEqual({status: 'updated'})
  expect(apiMocks.updateAdminFeatureRequest).toHaveBeenCalledWith(input)
  expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledOnce()
  expect(result.requests()).toEqual([{...REQUEST, status: 'voting', targetVoteCount: 10}])
  expect(result.isUpdatingRequest(REQUEST.id)).toBe(false)

  apiMocks.updateAdminFeatureRequest.mockRejectedValueOnce(new Error('update failed'))
  await expect(result.updateRequest(input)).resolves.toEqual({status: 'unavailable'})
  expect(result.isUpdatingRequest(REQUEST.id)).toBe(false)
  cleanup()
})

it('should expose loading failures and ignore pagination without another page', async () => {
  apiMocks.listAdminFeatureRequests.mockRejectedValueOnce(new Error('load failed'))

  const {cleanup, result} = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.loadFailed()).toBe(true))

  await result.loadMore()

  expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledOnce()
  cleanup()
})

it('should retry a failed reconciliation without hiding the loaded rows or ending pagination', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  await view.result.loadMore()
  expect(view.result.requests()).toMatchObject([{id: REQUEST.id, status: 'completed'}])
  expect(view.result.hasMore()).toBe(true)
  expect(view.result.loadMoreFailed()).toBe(true)
  expect(view.result.loadFailed()).toBe(false)
  await view.result.loadMore()
  expect(view.result.requests().map((request) => request.id)).toEqual([REQUEST.id, NEXT_REQUEST.id])
  expect(view.result.hasMore()).toBe(false)
  expect(view.result.loadMoreFailed()).toBe(false)
  view.cleanup()
})

it('should reconcile after a save finishes during an older last-page load', async () => {
  const pending = Promise.withResolvers<FeatureRequestPage>()
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  const more = view.result.loadMore()
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  pending.resolve({hasMore: false, requests: [REQUEST]})
  await more
  expect(view.result.hasMore()).toBe(true)
  await view.result.loadMore()
  expect(view.result.requests()).toMatchObject([
    {id: REQUEST.id, status: 'completed'},
    {id: NEXT_REQUEST.id},
  ])
  expect(view.result.hasMore()).toBe(false)
  view.cleanup()
})

it('should preserve local forms and retry reconciliation when another save finishes during it', async () => {
  const pending = Promise.withResolvers<FeatureRequestPage>()
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  const more = view.result.loadMore()
  await view.result.updateRequest({requestId: REQUEST.id, status: 'confirmed', targetVoteCount: 10})
  pending.resolve({hasMore: false, requests: [REQUEST]})
  await more
  expect(view.result.requests()).toMatchObject([
    {id: REQUEST.id, status: 'confirmed', targetVoteCount: 10},
  ])
  expect(view.result.hasMore()).toBe(true)
  await view.result.loadMore()
  expect(view.result.requests()).toMatchObject([
    {id: REQUEST.id, status: 'confirmed'},
    {id: NEXT_REQUEST.id},
  ])
  expect(view.result.hasMore()).toBe(false)
  view.cleanup()
})

it('should retain rows discovered during reconciliation on a later manual refresh', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  await view.result.loadMore()
  expect(view.result.requests()).toMatchObject([
    {id: REQUEST.id, status: 'completed'},
    {id: NEXT_REQUEST.id},
  ])
  await view.result.refresh()
  expect(view.result.requests()).toMatchObject([
    {id: NEXT_REQUEST.id},
    {id: REQUEST.id, status: 'completed'},
  ])
  expect(view.result.hasMore()).toBe(false)
  view.cleanup()
})

it('should retry a failed later reconciliation page from the server prefix', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockRejectedValueOnce(new Error('later page unavailable'))
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  await view.result.loadMore()
  expect(view.result.loadMoreFailed()).toBe(true)
  expect(view.result.hasMore()).toBe(true)
  await view.result.loadMore()
  expect(view.result.requests().map((request) => request.id)).toEqual([REQUEST.id, NEXT_REQUEST.id])
  expect(view.result.loadMoreFailed()).toBe(false)
  expect(view.result.hasMore()).toBe(false)
  expect(apiMocks.listAdminFeatureRequests.mock.calls.map(([options]) => options.offset)).toEqual([
    0, 0, 1, 0, 1,
  ])
  view.cleanup()
})

it('should clear a reconciliation failure after a successful manual refresh', async () => {
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce({hasMore: false, requests: [REQUEST]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  await view.result.loadMore()
  expect(view.result.loadMoreFailed()).toBe(true)
  await view.result.refresh()
  expect(view.result.loadMoreFailed()).toBe(false)
  expect(view.result.loadFailed()).toBe(false)
  view.cleanup()
})

it('should ignore a reconciliation response superseded by a manual refresh', async () => {
  const pending = Promise.withResolvers<FeatureRequestPage>()
  const refreshed = {...REQUEST, title: '갱신된 기능'}
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({hasMore: false, requests: [refreshed]})
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  const more = view.result.loadMore()
  await waitFor(() => expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledTimes(2))
  await view.result.refresh()
  pending.resolve({hasMore: true, requests: [NEXT_REQUEST]})
  await more
  expect(view.result.requests()).toEqual([refreshed])
  expect(view.result.hasMore()).toBe(false)
  expect(view.result.isLoading()).toBe(false)
  expect(view.result.isLoadingMore()).toBe(false)
  view.cleanup()
})

it('should ignore an unfinished reconciliation after disposal', async () => {
  const pending = Promise.withResolvers<FeatureRequestPage>()
  apiMocks.listAdminFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(pending.promise)
  apiMocks.updateAdminFeatureRequest.mockResolvedValue({status: 'updated'})
  const view = renderHook(() => useAdminFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(view.result.isLoading()).toBe(false))
  await view.result.updateRequest({
    requestId: REQUEST.id,
    status: 'completed',
    targetVoteCount: null,
  })
  const more = view.result.loadMore()
  await waitFor(() => expect(apiMocks.listAdminFeatureRequests).toHaveBeenCalledTimes(2))
  const previous = view.result.requests()
  view.cleanup()
  pending.resolve({hasMore: false, requests: [NEXT_REQUEST]})
  await more
  expect(view.result.requests()).toBe(previous)
  expect(view.result.hasMore()).toBe(true)
})

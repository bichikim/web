/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest, FeatureRequestPage} from '../types'

const apiMocks = vi.hoisted(() => ({
  createFeatureRequest: vi.fn(),
  listFeatureRequests: vi.fn(),
  voteFeatureRequest: vi.fn(),
}))

vi.mock('../api', () => apiMocks)

import {useFeatureRequests} from '../use-feature-requests'

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

it('should load a page and append the next page at the current offset', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  expect(result.requests()).toEqual([REQUEST])
  expect(result.hasMore()).toBe(true)

  await result.loadMore()

  expect(apiMocks.listFeatureRequests).toHaveBeenNthCalledWith(2, {offset: 1})
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should preserve hasMore when refreshing fails after loading more requests', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockRejectedValueOnce(new Error('refresh failed'))

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.hasMore()).toBe(true)

  await result.refresh()

  expect(result.loadFailed()).toBe(true)
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(true)
  cleanup()
})

it('should update hasMore when creating after loading all available pages', async () => {
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
  expect(result.hasMore()).toBe(true)
  cleanup()
})

it('should keep loaded pages after refreshing before creating a feature request', async () => {
  const refreshedRequest = {...REQUEST, title: '새로 고침된 기능'}
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [refreshedRequest]})
    .mockResolvedValueOnce({hasMore: true, requests: [refreshedRequest]})
  apiMocks.createFeatureRequest.mockResolvedValue({status: 'created'})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.refresh()

  expect(result.requests()).toEqual([refreshedRequest, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)

  await result.createRequest({description: '상세 설명', title: '새 요청'})

  expect(result.requests()).toEqual([refreshedRequest, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should keep existing requests when a created request enters the first page', async () => {
  const createdRequest = {...REQUEST, id: '019d1990-1dc9-7255-a7b5-f9459dfaf784'}
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [createdRequest]})
  apiMocks.createFeatureRequest.mockResolvedValue({status: 'created'})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.createRequest({description: '상세 설명', title: '새 요청'})

  expect(result.requests()).toEqual([createdRequest, REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(true)
  cleanup()
})

it('should retain loaded pages when voting for a later-page request', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.voteFeatureRequest.mockResolvedValue({status: 'voted'})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.voteRequest(NEXT_REQUEST.id)

  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(2)
  expect(result.requests()).toEqual([
    REQUEST,
    {...NEXT_REQUEST, voteCount: NEXT_REQUEST.voteCount + 1, votedByCurrentUser: true},
  ])
  cleanup()
})

it('should retain loaded pages when a later-page request was already voted', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.voteFeatureRequest.mockResolvedValue({status: 'already-voted'})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.voteRequest(NEXT_REQUEST.id)

  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(2)
  expect(result.requests()).toEqual([REQUEST, {...NEXT_REQUEST, votedByCurrentUser: true}])
  cleanup()
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

it('should ignore a load more response that started before refresh', async () => {
  const loadMoreResponse = Promise.withResolvers<FeatureRequestPage>()
  const refreshResponse = Promise.withResolvers<FeatureRequestPage>()
  const refreshedRequest = {...REQUEST, title: '새로 고침된 기능'}
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(loadMoreResponse.promise)
    .mockReturnValueOnce(refreshResponse.promise)

  const {cleanup, result} = renderHook(() => useFeatureRequests())
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

it('should refresh after creating and update the request after voting', async () => {
  apiMocks.listFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.createFeatureRequest.mockResolvedValue({status: 'created'})
  apiMocks.voteFeatureRequest.mockResolvedValue({status: 'voted'})

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await expect(result.createRequest({description: '상세 설명', title: '요청'})).resolves.toEqual({
    status: 'created',
  })
  await expect(result.voteRequest(REQUEST.id)).resolves.toEqual({status: 'voted'})

  expect(apiMocks.createFeatureRequest).toHaveBeenCalledWith({
    description: '상세 설명',
    title: '요청',
  })
  expect(apiMocks.voteFeatureRequest).toHaveBeenCalledWith(REQUEST.id)
  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(2)
  expect(result.requests()).toEqual([
    {...REQUEST, voteCount: REQUEST.voteCount + 1, votedByCurrentUser: true},
  ])
  expect(result.votingRequestId()).toBeNull()
  cleanup()
})

it('should expose unavailable states when requests cannot be loaded or submitted', async () => {
  apiMocks.listFeatureRequests.mockRejectedValueOnce(new Error('load failed'))

  const {cleanup, result} = renderHook(() => useFeatureRequests())
  await waitFor(() => expect(result.loadFailed()).toBe(true))

  apiMocks.createFeatureRequest.mockRejectedValueOnce(new Error('create failed'))
  apiMocks.voteFeatureRequest.mockRejectedValueOnce(new Error('vote failed'))

  await expect(result.createRequest({description: '', title: '요청'})).resolves.toEqual({
    status: 'unavailable',
  })
  await expect(result.voteRequest(REQUEST.id)).resolves.toEqual({status: 'unavailable'})
  expect(result.isSubmitting()).toBe(false)
  expect(result.votingRequestId()).toBeNull()
  cleanup()
})

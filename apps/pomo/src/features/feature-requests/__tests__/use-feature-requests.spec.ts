/** @vitest-environment jsdom */

import {MemoryRouter, query} from '@solidjs/router'
import {renderHook, waitFor} from '@solidjs/testing-library'
import {createComponent, createSignal, type ParentComponent} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthenticationState} from '../../auth/machine'
import type {FeatureRequest, FeatureRequestPage} from '../types'

const RouterWrapper: ParentComponent = (props) =>
  createComponent(MemoryRouter, {root: () => props.children})

const apiMocks = vi.hoisted(() => ({
  createFeatureRequest: vi.fn(),
  listFeatureRequests: vi.fn(),
  voteFeatureRequest: vi.fn(),
}))

vi.mock('../api', () => apiMocks)
const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))
vi.mock('../../auth/AuthProvider', () => authMocks)
const [authenticationState, setAuthenticationState] = createSignal<AuthenticationState>({
  kind: 'anonymous',
})

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
  query.clear()
  setAuthenticationState({kind: 'anonymous'})
  authMocks.useAuth.mockReturnValue({state: authenticationState})
})

it('should load a page and append the next page at the current offset', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  expect(result.requests()).toEqual([REQUEST])
  expect(result.hasMore()).toBe(true)

  await result.loadMore()

  expect(apiMocks.listFeatureRequests).toHaveBeenNthCalledWith(2, {offset: 1})
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should base the next offset on the refreshed server page instead of preserved ghosts', async () => {
  const ghostRequest = {...REQUEST, id: '019d1990-1dc9-7255-a7b5-f9459dfaf784'}
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [ghostRequest]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.refresh()

  expect(result.requests()).toEqual([REQUEST, ghostRequest])

  await result.loadMore()

  expect(apiMocks.listFeatureRequests).toHaveBeenNthCalledWith(4, {offset: 1})
  expect(result.requests()).toEqual([REQUEST, ghostRequest, NEXT_REQUEST])
  cleanup()
})

it('should not duplicate a preserved request when loading its refreshed page again', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  await result.refresh()
  await result.loadMore()

  expect(apiMocks.listFeatureRequests).toHaveBeenNthCalledWith(4, {offset: 1})
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  cleanup()
})

it('should adopt hasMore false after a manual refresh and keep loaded pages', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [REQUEST]})

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.hasMore()).toBe(true)

  await result.refresh()

  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(false)
  cleanup()
})

it('should preserve hasMore when refreshing fails after loading more requests', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockRejectedValueOnce(new Error('refresh failed'))

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  expect(result.hasMore()).toBe(true)

  await result.refresh()

  expect(result.loadFailed()).toBe(true)
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(true)
  cleanup()
})

it('should restore the last settled hasMore when the latest concurrent refresh fails', async () => {
  const firstRefreshResponse = Promise.withResolvers<FeatureRequestPage>()
  const latestRefreshResponse = Promise.withResolvers<FeatureRequestPage>()
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [NEXT_REQUEST]})
    .mockReturnValueOnce(firstRefreshResponse.promise)
    .mockReturnValueOnce(latestRefreshResponse.promise)

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await result.loadMore()
  const firstRefresh = result.refresh()
  await waitFor(() => expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(3))
  const latestRefresh = result.refresh()
  await waitFor(() => expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(4))
  latestRefreshResponse.reject(new Error('latest refresh failed'))
  await latestRefresh

  expect(result.loadFailed()).toBe(true)
  expect(result.hasMore()).toBe(true)

  firstRefreshResponse.resolve({hasMore: false, requests: [REQUEST]})
  await firstRefresh

  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.hasMore()).toBe(true)
  expect(result.loadFailed()).toBe(true)
  cleanup()
})

it('should update hasMore when creating after loading all available pages', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: [NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
  apiMocks.createFeatureRequest.mockResolvedValue({status: 'created'})

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

it('should refresh after creating and update the request after voting', async () => {
  apiMocks.listFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.createFeatureRequest.mockResolvedValue({status: 'created'})
  apiMocks.voteFeatureRequest.mockResolvedValue({status: 'voted'})

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

  const {cleanup, result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
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

it('should clear prior session rows and ignore its pending page when auth changes', async () => {
  const previousPage = Promise.withResolvers<FeatureRequestPage>()
  const nextPage = Promise.withResolvers<FeatureRequestPage>()
  setAuthenticationState({kind: 'authenticated', provider: 'toss'})
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [{...REQUEST, votedByCurrentUser: true}]})
    .mockReturnValueOnce(previousPage.promise)
    .mockReturnValueOnce(nextPage.promise)
  const {result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  const pendingPage = result.loadMore()

  setAuthenticationState({kind: 'authenticated', provider: 'toss'})
  expect(result.requests()).toEqual([])
  expect(result.isLoadingMore()).toBe(false)
  nextPage.resolve({hasMore: false, requests: [REQUEST]})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  previousPage.resolve({hasMore: true, requests: [NEXT_REQUEST]})
  await pendingPage

  expect(result.requests()).toEqual([REQUEST])
  expect(result.hasMore()).toBe(false)
})

it('should ignore a previous session vote and preserve the new pending vote state', async () => {
  const previousVote = Promise.withResolvers<{status: 'voted'}>()
  const currentVote = Promise.withResolvers<{status: 'voted'}>()
  apiMocks.listFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.voteFeatureRequest
    .mockReturnValueOnce(previousVote.promise)
    .mockReturnValueOnce(currentVote.promise)
  setAuthenticationState({email: 'first@example.com', kind: 'authenticated', provider: 'email'})
  const {result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  const staleVote = result.voteRequest(REQUEST.id)
  expect(result.requests()).toEqual([REQUEST])

  setAuthenticationState({kind: 'anonymous'})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  const newVote = result.voteRequest(REQUEST.id)
  previousVote.resolve({status: 'voted'})
  await staleVote
  expect(result.requests()).toEqual([REQUEST])
  expect(result.votingRequestId()).toBe(REQUEST.id)

  currentVote.resolve({status: 'voted'})
  await newVote
  expect(result.requests()).toEqual([{...REQUEST, voteCount: 3, votedByCurrentUser: true}])
  expect(result.votingRequestId()).toBeNull()
})

it('should not refresh a new session after a prior session creation completes', async () => {
  const creation = Promise.withResolvers<{status: 'created'}>()
  apiMocks.listFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  apiMocks.createFeatureRequest.mockReturnValueOnce(creation.promise)
  const {result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  const pendingCreation = result.createRequest({description: '', title: 'request'})
  setAuthenticationState({kind: 'anonymous'})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  creation.resolve({status: 'created'})
  await pendingCreation
  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(2)
  expect(result.isSubmitting()).toBe(false)
})

it('should reuse a cached page only while the resolved auth state is unchanged', async () => {
  apiMocks.listFeatureRequests.mockResolvedValue({hasMore: false, requests: [REQUEST]})
  const first = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(first.result.isLoading()).toBe(false))
  first.cleanup()
  const second = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(second.result.isLoading()).toBe(false))
  expect(apiMocks.listFeatureRequests).toHaveBeenCalledOnce()
  second.cleanup()
  setAuthenticationState({kind: 'anonymous'})
  const third = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(third.result.isLoading()).toBe(false))
  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(2)
})

it('should retry a failed cached page and advance by its raw duplicate-inclusive length', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockRejectedValueOnce(new Error('page failed'))
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST, NEXT_REQUEST]})
    .mockResolvedValueOnce({hasMore: false, requests: []})
  const {result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  await result.loadMore()
  expect(result.loadMoreFailed()).toBe(true)
  await result.loadMore()
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.loadMoreFailed()).toBe(false)
  await result.loadMore()
  expect(apiMocks.listFeatureRequests).toHaveBeenNthCalledWith(4, {offset: 3})
})

it('should keep the current page load pending when an obsolete load settles', async () => {
  const obsoletePage = Promise.withResolvers<FeatureRequestPage>()
  const currentPage = Promise.withResolvers<FeatureRequestPage>()
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(obsoletePage.promise)
    .mockResolvedValueOnce({hasMore: true, requests: [REQUEST]})
    .mockReturnValueOnce(currentPage.promise)
  const {result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))
  const obsoleteLoad = result.loadMore()
  await result.refresh()
  const currentLoad = result.loadMore()
  await result.loadMore()
  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(4)

  obsoletePage.reject(new Error('obsolete page failed'))
  await obsoleteLoad
  expect(result.isLoadingMore()).toBe(true)
  expect(result.loadMoreFailed()).toBe(false)
  currentPage.resolve({hasMore: false, requests: [NEXT_REQUEST]})
  await currentLoad
  expect(result.requests()).toEqual([REQUEST, NEXT_REQUEST])
  expect(result.isLoadingMore()).toBe(false)
})

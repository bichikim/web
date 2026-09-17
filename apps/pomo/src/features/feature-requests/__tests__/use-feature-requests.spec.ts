/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {FeatureRequest} from '../types'

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

it('should refresh after creating and voting for a request', async () => {
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
  expect(apiMocks.listFeatureRequests).toHaveBeenCalledTimes(3)
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

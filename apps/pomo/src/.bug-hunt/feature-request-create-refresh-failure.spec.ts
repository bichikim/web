/** @vitest-environment jsdom */

import {MemoryRouter, query} from '@solidjs/router'
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {createComponent, createSignal, type ParentComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {AuthenticationState} from '../features/auth/machine'
import type {FeatureRequest} from '../features/feature-requests/types'

const RouterWrapper: ParentComponent = (props) =>
  createComponent(MemoryRouter, {root: () => props.children})

const apiMocks = vi.hoisted(() => ({
  createFeatureRequest: vi.fn(),
  listFeatureRequests: vi.fn(),
  voteFeatureRequest: vi.fn(),
}))

vi.mock('../features/feature-requests/api', () => apiMocks)

const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))
vi.mock('../features/auth/AuthProvider', () => authMocks)

const [authenticationState, setAuthenticationState] = createSignal<AuthenticationState>({
  kind: 'authenticated',
  provider: 'email',
  email: 'user@example.com',
})

import {useFeatureRequests} from '../features/feature-requests/use-feature-requests'

const CREATED_REQUEST: FeatureRequest = {
  createdAt: '2026-09-17T01:00:00.000Z',
  description: '설명',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  status: 'requested',
  targetVoteCount: null,
  title: '새 기능',
  voteCount: 0,
  votedByCurrentUser: false,
}

beforeEach(() => {
  vi.resetAllMocks()
  query.clear()
  setAuthenticationState({email: 'user@example.com', kind: 'authenticated', provider: 'email'})
  authMocks.useAuth.mockReturnValue({state: authenticationState})
})

afterEach(cleanup)

it('should keep the new request visible when the post-create list refresh fails', async () => {
  apiMocks.listFeatureRequests
    .mockResolvedValueOnce({hasMore: false, requests: []})
    .mockRejectedValueOnce(new Error('refresh failed'))
  apiMocks.createFeatureRequest.mockResolvedValue({status: 'created'})

  const {result} = renderHook(() => useFeatureRequests(), {wrapper: RouterWrapper})
  await waitFor(() => expect(result.isLoading()).toBe(false))

  await expect(
    result.createRequest({description: CREATED_REQUEST.description, title: CREATED_REQUEST.title}),
  ).resolves.toEqual({status: 'created'})

  expect(result.requests()).toEqual([CREATED_REQUEST])
})

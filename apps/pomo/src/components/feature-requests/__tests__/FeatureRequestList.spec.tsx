/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {AuthController} from '../../../features/auth/controller'
import type {AuthenticationState} from '../../../features/auth/machine'
import type {FeatureRequest, FeatureRequestsController} from '../../../features/feature-requests'
import {FeatureRequestList} from '../FeatureRequestList'

const [authenticationState] = createSignal<AuthenticationState>({kind: 'anonymous'})
const authentication: AuthController = {
  session: () => null,
  state: authenticationState,
}
const model: FeatureRequestsController = {
  createRequest: vi.fn(),
  hasMore: () => false,
  isLoading: () => false,
  isLoadingMore: () => false,
  isSubmitting: () => false,
  loadFailed: () => false,
  loadMore: vi.fn(async () => undefined),
  loadMoreFailed: () => false,
  refresh: vi.fn(async () => undefined),
  requests: () => [],
  voteRequest: vi.fn(),
  votingRequestId: () => null,
}

it('should place the new request action in the list header', () => {
  render(() => (
    <FeatureRequestList
      authentication={authentication}
      model={model}
      newRequestAction={<button type="button">{m.feature_request_new()}</button>}
    />
  ))

  const heading = screen.getByRole('heading', {name: m.feature_request_list_title()})
  const newRequestAction = screen.getByRole('button', {name: m.feature_request_new()})

  expect(heading.parentElement).toContainElement(newRequestAction)
})

it('should show a load more action when more requests are available', () => {
  const loadMore = vi.fn(async () => undefined)
  const paginatedModel: FeatureRequestsController = {
    ...model,
    hasMore: () => true,
    loadMore,
  }

  render(() => (
    <FeatureRequestList
      authentication={authentication}
      model={paginatedModel}
      newRequestAction={<button type="button">{m.feature_request_new()}</button>}
    />
  ))

  screen.getByRole('button', {name: m.feature_request_load_more()}).click()

  expect(loadMore).toHaveBeenCalledOnce()
})

it('should retain the vote card and button while applying a successful vote', () => {
  const request: FeatureRequest = {
    createdAt: '2026-10-01T00:00:00Z',
    description: '설명',
    id: 'one',
    status: 'voting',
    targetVoteCount: 10,
    title: '기능 제안',
    voteCount: 0,
    votedByCurrentUser: false,
  }
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([request])
  const voteRequest: FeatureRequestsController['voteRequest'] = async () => {
    setRequests([{...request, voteCount: 1, votedByCurrentUser: true}])
    return {status: 'voted'}
  }
  render(() => (
    <FeatureRequestList
      authentication={{
        ...authentication,
        session: () => ({kind: 'authenticated', provider: 'toss'}),
      }}
      model={{...model, requests, voteRequest}}
      newRequestAction={null}
    />
  ))
  const article = screen.getByRole('article', {name: '기능 제안'})
  const button = screen.getByRole('button', {name: /\+1 하기/})
  fireEvent.click(button)
  expect(screen.getByRole('article', {name: '기능 제안'})).toBe(article)
  expect(article.querySelector('button')).toBe(button)
  expect(button).toBeDisabled()
  expect(article).toHaveTextContent('1 / 10')
})

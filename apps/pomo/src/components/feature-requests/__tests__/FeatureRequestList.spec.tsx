/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {AuthController} from '../../../features/auth/controller'
import type {AuthenticationState} from '../../../features/auth/machine'
import type {FeatureRequestsController} from '../../../features/feature-requests'
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

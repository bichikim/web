/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {
  AdminFeatureRequestsController,
  AdminFeatureRequestStatusInput,
} from '../../../features/feature-requests/use-admin-feature-requests'
import type {FeatureRequest} from '../../../features/feature-requests'
import {AdminFeatureRequestCard} from '../AdminFeatureRequestCard'
import {AdminFeatureRequests} from '../AdminFeatureRequests'

const featureRequestMocks = vi.hoisted(() => ({useAdminFeatureRequests: vi.fn()}))

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children?: JSX.Element; readonly href: string}) => (
    <a href={props.href}>{props.children}</a>
  ),
}))
vi.mock('../../../features/feature-requests/use-admin-feature-requests', () => featureRequestMocks)
vi.mock('../AdminFeatureRequestCard', () => ({AdminFeatureRequestCard: vi.fn()}))

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

const createModel = (updateResult: {
  readonly status: 'conflict' | 'invalid' | 'not-found' | 'unavailable' | 'updated'
}): AdminFeatureRequestsController => {
  const [isLoading] = createSignal(false)
  const [isLoadingMore] = createSignal(false)
  const [loadFailed] = createSignal(false)
  const [loadMoreFailed] = createSignal(false)
  const [updatingRequestId] = createSignal<string | null>(null)

  return {
    hasMore: () => true,
    isLoading,
    isLoadingMore,
    loadFailed,
    loadMore: vi.fn(async () => undefined),
    loadMoreFailed,
    refresh: vi.fn(async () => undefined),
    requests: () => [REQUEST],
    updateRequest: vi.fn(async (_input: AdminFeatureRequestStatusInput) => updateResult),
    updatingRequestId,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(AdminFeatureRequestCard).mockImplementation((props) => {
    const [message, setMessage] = createSignal<string | null>(null)
    return (
      <div>
        <button
          onClick={() => {
            props
              .onSave({requestId: props.request.id, status: 'voting', targetVoteCount: 10})
              .then(setMessage)
              .catch(() => setMessage('저장하지 못했습니다.'))
          }}
          type="button"
        >
          요청 저장
        </button>
        {message()}
      </div>
    )
  })
})

it('should render administrator requests and delegate pagination', async () => {
  const model = createModel({status: 'updated'})
  featureRequestMocks.useAdminFeatureRequests.mockReturnValue(model)

  render(() => <AdminFeatureRequests />)

  expect(
    screen.getByRole('heading', {name: m.admin_feature_requests_heading()}),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_load_more()}))
  expect(model.loadMore).toHaveBeenCalledOnce()

  fireEvent.click(screen.getByRole('button', {name: '요청 저장'}))
  await waitFor(() => expect(model.updateRequest).toHaveBeenCalledOnce())
})

it.each([
  ['not-found', m.admin_feature_request_update_not_found()],
  ['invalid', m.admin_feature_request_update_invalid()],
  ['conflict', m.admin_feature_request_update_conflict()],
  ['unavailable', m.admin_feature_request_update_failed()],
] as const)('should explain an administrator update result of %s', async (status, message) => {
  const model = createModel({status})
  featureRequestMocks.useAdminFeatureRequests.mockReturnValue(model)

  render(() => <AdminFeatureRequests />)
  fireEvent.click(screen.getByRole('button', {name: '요청 저장'}))

  expect(await screen.findByText(message)).toBeInTheDocument()
})

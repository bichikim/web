/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {AuthController} from '../../../features/auth/controller'
import type {AuthenticationState} from '../../../features/auth/machine'
import type {FeatureRequestsController} from '../../../features/feature-requests'
import {FeatureRequestForm} from '../FeatureRequestForm'

const [authenticationState, setAuthenticationState] = createSignal<AuthenticationState>({
  kind: 'authenticated',
  provider: 'toss',
})
const authenticationSession = () => {
  const state = authenticationState()
  return state.kind === 'authenticated' ? state : null
}
const authentication: AuthController = {
  session: authenticationSession,
  state: authenticationState,
}
const createRequest = vi.fn()
const model: FeatureRequestsController = {
  createRequest,
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

beforeEach(() => {
  sessionStorage.clear()
  setAuthenticationState({kind: 'authenticated', provider: 'toss'})
  createRequest.mockReset()
  createRequest.mockResolvedValue({status: 'created'})
})

afterEach(() => {
  sessionStorage.clear()
})

it('should open a separate modal and restore a draft after the modal is closed', async () => {
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  const titleInput = await screen.findByRole('textbox', {name: m.feature_request_title_label()})
  fireEvent.input(titleInput, {target: {value: '집중 세션 통계'}})
  fireEvent.input(screen.getByRole('textbox', {name: m.feature_request_details_label()}), {
    target: {value: '통계를 확인하고 싶어요.'},
  })

  expect(sessionStorage.getItem('pomo:feature-request:draft:v1')).toContain('집중 세션 통계')

  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-closed', ''))

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  expect(await screen.findByRole('textbox', {name: m.feature_request_title_label()})).toHaveValue(
    '집중 세션 통계',
  )
  expect(screen.getByRole('textbox', {name: m.feature_request_details_label()})).toHaveValue(
    '통계를 확인하고 싶어요.',
  )
})

it('should clear the session draft after a successful submission', async () => {
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  const titleInput = (await screen.findByRole('textbox', {
    name: m.feature_request_title_label(),
  })) as HTMLInputElement
  fireEvent.input(titleInput, {
    target: {value: '새 기능'},
  })
  fireEvent.submit(titleInput.form!)

  await waitFor(() =>
    expect(createRequest).toHaveBeenCalledWith({description: '', title: '새 기능'}),
  )
  expect(sessionStorage.getItem('pomo:feature-request:draft:v1')).toBeNull()
})

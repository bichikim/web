/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {AuthController} from '../features/auth/controller'
import type {FeatureRequestsController} from '../features/feature-requests'
import {FeatureRequestForm} from '../components/feature-requests/FeatureRequestForm'
import {PModal, type PModalProps} from '../components/p-modal/PModal'

vi.mock('../components/p-modal/PModal', () => ({PModal: vi.fn()}))

beforeEach(() => {
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} role="dialog">
      {props.children}
    </div>
  ))
})

it('should ignore a second submit before the first createRequest finishes', async () => {
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  let releaseFirstRequest: (() => void) | undefined
  const createRequest = vi.fn(
    () =>
      new Promise<{status: 'created'}>((resolve) => {
        setIsSubmitting(true)
        releaseFirstRequest = () => {
          setIsSubmitting(false)
          resolve({status: 'created'})
        }
      }),
  )
  const authentication: AuthController = {
    session: () => ({provider: 'toss'}),
    state: () => ({kind: 'authenticated', provider: 'toss'}),
  }
  const model: FeatureRequestsController = {
    createRequest,
    hasMore: () => false,
    isLoading: () => false,
    isLoadingMore: () => false,
    isSubmitting,
    loadFailed: () => false,
    loadMore: vi.fn(async () => undefined),
    loadMoreFailed: () => false,
    refresh: vi.fn(async () => undefined),
    requests: () => [],
    voteRequest: vi.fn(),
    votingRequestId: () => null,
  }

  render(() => <FeatureRequestForm authentication={authentication} model={model} />)
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  fireEvent.input(screen.getByRole('textbox', {name: m.feature_request_title_label()}), {
    target: {value: '중복 제출 방지'},
  })

  const form = screen.getByRole('button', {name: m.feature_request_submit()}).closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)

  await waitFor(() => expect(createRequest).toHaveBeenCalledOnce())
  releaseFirstRequest?.()
})

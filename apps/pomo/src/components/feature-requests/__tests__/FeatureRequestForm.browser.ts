import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'

import type {AuthController} from '../../../features/auth/controller'
import type {FeatureRequestsController} from '../../../features/feature-requests'
import type {CreateFeatureRequestResult} from '../../../features/feature-requests/api'
import {FeatureRequestForm} from '../FeatureRequestForm'

const authentication: AuthController = {
  session: () => ({kind: 'authenticated', provider: 'toss'}),
  state: () => ({kind: 'authenticated', provider: 'toss'}),
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

it('should ignore repeated requestSubmit while pending and accept a later request', async () => {
  sessionStorage.clear()
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const pending = Promise.withResolvers<CreateFeatureRequestResult>()
  const createRequest = vi.fn(async () => {
    setIsSubmitting(true)
    try {
      return await pending.promise
    } finally {
      setIsSubmitting(false)
    }
  })
  const model: FeatureRequestsController = {
    createRequest,
    hasMore: () => false,
    isLoading: () => false,
    isLoadingMore: () => false,
    isSubmitting,
    loadFailed: () => false,
    loadMore: vi.fn(),
    loadMoreFailed: () => false,
    refresh: vi.fn(),
    requests: () => [],
    voteRequest: vi.fn(),
    votingRequestId: () => null,
  }
  render(() => createComponent(FeatureRequestForm, {authentication, model}))
  await page.getByRole('button', {name: m.feature_request_new()}).click()
  const title = page.getByRole('textbox', {name: m.feature_request_title_label()})
  await title.fill('브라우저 중복 제출')
  const form = (title.element() as HTMLInputElement).form!
  form.requestSubmit()
  form.requestSubmit()
  expect(createRequest).toHaveBeenCalledTimes(1)
  await expect
    .element(page.getByRole('button', {name: m.feature_request_submitting()}))
    .toBeDisabled()

  pending.resolve({status: 'created'})
  await expect.element(page.getByText(m.feature_request_created())).toBeVisible()
  await expect.element(title).toHaveValue('')
  await title.fill('새 요청')
  await page.getByRole('button', {name: m.feature_request_submit()}).click()
  await expect.poll(() => createRequest.mock.calls.length).toBe(2)
})

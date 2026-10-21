/** @vitest-environment jsdom */

import {MemoryRouter, query} from '@solidjs/router'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {AuthController} from '../../../features/auth/controller'
import {useAuth} from '../../../features/auth/AuthProvider'
import {
  createFeatureRequest,
  type CreateFeatureRequestResult,
  listFeatureRequests,
} from '../../../features/feature-requests/api'
import {useFeatureRequests} from '../../../features/feature-requests/use-feature-requests'
import {FeatureRequestForm} from '../FeatureRequestForm'

vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: vi.fn()}))
vi.mock('../../../features/feature-requests/api', () => ({
  createFeatureRequest: vi.fn(),
  listAdminFeatureRequests: vi.fn(),
  listFeatureRequests: vi.fn(),
  voteFeatureRequest: vi.fn(),
}))

const authentication: AuthController = {
  session: () => ({kind: 'authenticated', provider: 'toss'}),
  state: () => ({kind: 'authenticated', provider: 'toss'}),
}

beforeEach(() => {
  query.clear()
  sessionStorage.clear()
  vi.mocked(useAuth).mockReturnValue(authentication)
  vi.mocked(listFeatureRequests).mockResolvedValue({hasMore: false, requests: []})
})

afterEach(() => {
  cleanup()
  query.clear()
  vi.resetAllMocks()
})

it('should send one API request for repeated native form submits through the actual controller', async () => {
  const pending = Promise.withResolvers<CreateFeatureRequestResult>()
  vi.mocked(createFeatureRequest).mockReturnValueOnce(pending.promise)
  const FormWithController = () => {
    const model = useFeatureRequests()
    return <FeatureRequestForm authentication={authentication} model={model} />
  }
  render(() => <MemoryRouter root={FormWithController} />)
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  const title = await screen.findByRole('textbox', {name: m.feature_request_title_label()})
  fireEvent.input(title, {target: {value: '통합 중복 제출 검증'}})
  const form = (title as HTMLInputElement).form!
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(createFeatureRequest).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', {name: m.feature_request_submitting()})).toBeDisabled()
  pending.resolve({status: 'created'})
  await screen.findByText(m.feature_request_created())
  await waitFor(() =>
    expect(screen.getByRole('button', {name: m.feature_request_submit()})).toBeEnabled(),
  )
  expect(title).toHaveValue('')
  expect(createFeatureRequest).toHaveBeenLastCalledWith({
    description: '',
    title: '통합 중복 제출 검증',
  })
})

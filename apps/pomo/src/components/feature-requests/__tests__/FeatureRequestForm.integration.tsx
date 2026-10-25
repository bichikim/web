/** @vitest-environment jsdom */

import {MemoryRouter, query} from '@solidjs/router'
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
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
import {PFeatureRequest} from '../../p-feature-request/PFeatureRequest'

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
  const readStyles = globalThis.getComputedStyle.bind(globalThis)
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
})

afterEach(() => {
  cleanup()
  query.clear()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

const DRAFT_KEY = 'pomo:feature-request:draft:v1'
const submittedDraft = {description: '  기존 설명  ', title: '  기존 제목  ', version: 1}

const openRequestForm = async () => {
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_open()}))
  await screen.findByText(m.feature_request_empty())
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  return (await screen.findByRole('textbox', {
    name: m.feature_request_title_label(),
  })) as HTMLInputElement
}

const closeRequestDialogs = async () => {
  const creation = screen.getByRole('dialog', {name: m.feature_request_new()})
  fireEvent.click(within(creation).getByRole('button', {name: m.common_close()}))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', {name: m.feature_request_new()})).not.toBeInTheDocument(),
  )
  const requests = screen.getByRole('dialog', {name: m.feature_request_title()})
  fireEvent.click(within(requests).getByRole('button', {name: m.common_close()}))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', {name: m.feature_request_title()})).not.toBeInTheDocument(),
  )
}

const submitAndDisposeForm = async () => {
  const pending = Promise.withResolvers<CreateFeatureRequestResult>()
  vi.mocked(createFeatureRequest).mockReturnValueOnce(pending.promise)
  render(() => <MemoryRouter root={() => <PFeatureRequest />} />)
  const title = await openRequestForm()
  fireEvent.input(title, {target: {value: submittedDraft.title}})
  fireEvent.input(screen.getByRole('textbox', {name: m.feature_request_details_label()}), {
    target: {value: submittedDraft.description},
  })
  fireEvent.submit(title.form!)
  expect(createFeatureRequest).toHaveBeenCalledExactlyOnceWith({
    description: submittedDraft.description.trim(),
    title: submittedDraft.title.trim(),
  })
  await closeRequestDialogs()
  expect(title).not.toBeInTheDocument()
  return pending
}

it.each([
  {description: submittedDraft.description, field: 'title', title: '새 제목 B'},
  {description: '새 설명 B', field: 'description', title: submittedDraft.title},
])('should restore the newer $field draft after a disposed submission succeeds', async (draft) => {
  const pending = await submitAndDisposeForm()
  const title = await openRequestForm()
  fireEvent.input(title, {target: {value: draft.title}})
  fireEvent.input(screen.getByRole('textbox', {name: m.feature_request_details_label()}), {
    target: {value: draft.description},
  })
  const expected = {description: draft.description, title: draft.title, version: 1}
  expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!)).toEqual(expected)
  pending.resolve({status: 'created'})
  // Drain the real controller's API, invalidation, refresh and form continuation before asserting.
  await flushPromises()
  await closeRequestDialogs()
  const restoredTitle = await openRequestForm()
  expect(restoredTitle).toHaveValue(draft.title)
  expect(screen.getByRole('textbox', {name: m.feature_request_details_label()})).toHaveValue(
    draft.description,
  )
  expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!)).toEqual(expected)
  expect(createFeatureRequest).toHaveBeenCalledOnce()
})

it('should clear an unchanged raw draft when its disposed submission succeeds', async () => {
  const pending = await submitAndDisposeForm()
  expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!)).toEqual(submittedDraft)
  pending.resolve({status: 'created'})
  await flushPromises()
  expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull()
  expect(await openRequestForm()).toHaveValue('')
})

it.each(['unavailable', 'unauthorized', 'invalid'] as const)(
  'should preserve a disposed submission draft after %s',
  async (status) => {
    const pending = await submitAndDisposeForm()
    pending.resolve({status})
    await flushPromises()
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!)).toEqual(submittedDraft)
    expect(await openRequestForm()).toHaveValue(submittedDraft.title)
    expect(screen.getByRole('textbox', {name: m.feature_request_details_label()})).toHaveValue(
      submittedDraft.description,
    )
  },
)

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

/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {AuthController} from '../../../features/auth/controller'
import type {AuthenticationState} from '../../../features/auth/machine'
import type {FeatureRequestsController} from '../../../features/feature-requests'
import {PModal, type PModalProps} from '../../p-modal/PModal'
import {FeatureRequestForm} from '../FeatureRequestForm'

vi.mock('../../p-modal/PModal', () => ({PModal: vi.fn()}))

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
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} data-closed={props.isOpen ? undefined : ''} role="dialog">
      {props.children}
      <button onClick={() => props.onOpenChange(false)} type="button">
        {m.common_close()}
      </button>
    </div>
  ))
})

afterEach(() => {
  sessionStorage.clear()
})

it('should open a separate modal and restore a draft after the modal is closed', () => {
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)

  expect(
    screen.queryByRole('textbox', {name: m.feature_request_title_label()}),
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  const titleInput = screen.getByRole('textbox', {name: m.feature_request_title_label()})
  fireEvent.input(titleInput, {target: {value: '집중 세션 통계'}})
  fireEvent.input(screen.getByRole('textbox', {name: m.feature_request_details_label()}), {
    target: {value: '통계를 확인하고 싶어요.'},
  })

  expect(sessionStorage.getItem('pomo:feature-request:draft:v1')).toContain('집중 세션 통계')

  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))
  expect(screen.getByRole('dialog')).toHaveAttribute('data-closed', '')
  expect(
    screen.queryByRole('textbox', {name: m.feature_request_title_label()}),
  ).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  expect(screen.getByRole('textbox', {name: m.feature_request_title_label()})).toHaveValue(
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
  const descriptionInput = screen.getByRole('textbox', {
    name: m.feature_request_details_label(),
  })
  fireEvent.input(titleInput, {
    target: {value: ' 새 기능 '},
  })
  fireEvent.input(descriptionInput, {target: {value: '   '}})
  fireEvent.submit(titleInput.form!)

  await waitFor(() =>
    expect(createRequest).toHaveBeenCalledWith({description: '', title: '새 기능'}),
  )
  expect(sessionStorage.getItem('pomo:feature-request:draft:v1')).toBeNull()
})

it('should preserve and reject an over-limit draft on programmatic form submission', () => {
  const title = '가'.repeat(121)
  const description = '설'.repeat(2001)

  render(() => <FeatureRequestForm authentication={authentication} model={model} />)
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))

  let titleInput = screen.getByRole('textbox', {
    name: m.feature_request_title_label(),
  }) as HTMLInputElement
  let descriptionInput = screen.getByRole('textbox', {
    name: m.feature_request_details_label(),
  }) as HTMLTextAreaElement

  fireEvent.input(titleInput, {target: {value: title}})
  fireEvent.input(descriptionInput, {target: {value: description}})
  expect(JSON.parse(sessionStorage.getItem('pomo:feature-request:draft:v1')!)).toEqual({
    description,
    title,
    version: 1,
  })

  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  titleInput = screen.getByRole('textbox', {
    name: m.feature_request_title_label(),
  }) as HTMLInputElement
  descriptionInput = screen.getByRole('textbox', {
    name: m.feature_request_details_label(),
  }) as HTMLTextAreaElement
  expect(titleInput).toHaveValue(title)
  expect(descriptionInput).toHaveValue(description)

  fireEvent.submit(titleInput.form!)

  expect(createRequest).not.toHaveBeenCalled()
  expect(screen.queryByText(m.feature_request_invalid())).not.toBeInTheDocument()
  expect(screen.getByText(m.feature_request_length_limit())).toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem('pomo:feature-request:draft:v1')!)).toEqual({
    description,
    title,
    version: 1,
  })
})

it('should reject an over-limit description without sending it', () => {
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))

  const titleInput = screen.getByRole('textbox', {
    name: m.feature_request_title_label(),
  }) as HTMLInputElement
  const descriptionInput = screen.getByRole('textbox', {
    name: m.feature_request_details_label(),
  }) as HTMLTextAreaElement
  fireEvent.input(titleInput, {target: {value: '유효한 제목'}})
  fireEvent.input(descriptionInput, {target: {value: '설'.repeat(2001)}})
  fireEvent.submit(titleInput.form!)

  expect(createRequest).not.toHaveBeenCalled()
  expect(screen.queryByText(m.feature_request_invalid())).not.toBeInTheDocument()
  expect(screen.getByText(m.feature_request_length_limit())).toBeInTheDocument()
})

it('should not show the blank-title message for a server-invalid response', async () => {
  createRequest.mockResolvedValueOnce({status: 'invalid'})
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))

  const titleInput = screen.getByRole('textbox', {
    name: m.feature_request_title_label(),
  }) as HTMLInputElement
  fireEvent.input(titleInput, {target: {value: '유효한 제목'}})
  fireEvent.submit(titleInput.form!)

  await waitFor(() =>
    expect(screen.getByText(m.feature_request_length_limit())).toBeInTheDocument(),
  )
  expect(screen.queryByText(m.feature_request_invalid())).not.toBeInTheDocument()
})

it('should accept the trimmed server limits and recover valid-invalid-valid in one mount', async () => {
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))

  const titleInput = screen.getByRole('textbox', {
    name: m.feature_request_title_label(),
  }) as HTMLInputElement
  const descriptionInput = screen.getByRole('textbox', {
    name: m.feature_request_details_label(),
  }) as HTMLTextAreaElement
  const form = titleInput.form!
  const title = '가'.repeat(120)
  const description = '설'.repeat(2000)

  fireEvent.input(titleInput, {target: {value: ` ${title} `}})
  fireEvent.input(descriptionInput, {target: {value: ` ${description} `}})
  fireEvent.submit(form)

  await waitFor(() => expect(createRequest).toHaveBeenNthCalledWith(1, {description, title}))
  await waitFor(() => expect(titleInput).toHaveValue(''))

  fireEvent.input(titleInput, {target: {value: '가'.repeat(121)}})
  fireEvent.input(descriptionInput, {target: {value: ''}})
  fireEvent.submit(form)

  expect(createRequest).toHaveBeenCalledTimes(1)
  expect(screen.queryByText(m.feature_request_invalid())).not.toBeInTheDocument()
  expect(screen.getByText(m.feature_request_length_limit())).toBeInTheDocument()

  fireEvent.input(titleInput, {target: {value: '다시 유효한 기능'}})
  fireEvent.input(descriptionInput, {target: {value: '설명'}})
  fireEvent.submit(form)

  await waitFor(() =>
    expect(createRequest).toHaveBeenNthCalledWith(2, {
      description: '설명',
      title: '다시 유효한 기능',
    }),
  )
  expect(screen.queryByText(m.feature_request_invalid())).not.toBeInTheDocument()
  expect(screen.queryByText(m.feature_request_length_limit())).not.toBeInTheDocument()
})

it('should keep the blank-title message for whitespace-only titles', () => {
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))

  const titleInput = screen.getByRole('textbox', {
    name: m.feature_request_title_label(),
  }) as HTMLInputElement
  fireEvent.input(titleInput, {target: {value: '   '}})
  fireEvent.submit(titleInput.form!)

  expect(createRequest).not.toHaveBeenCalled()
  expect(screen.getByText(m.feature_request_invalid())).toBeInTheDocument()
  expect(screen.queryByText(m.feature_request_length_limit())).not.toBeInTheDocument()
})

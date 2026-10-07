/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {z} from 'zod'

import * as m from '@paraglide/message'
import type {AuthController} from 'src/features/auth/controller'
import type {AuthenticationState} from 'src/features/auth/machine'
import type {FeatureRequestsController} from 'src/features/feature-requests'
import {createFeatureRequest} from 'src/features/feature-requests/api'
import {FeatureRequestForm} from 'src/components/feature-requests/FeatureRequestForm'
import {PModal, type PModalProps} from 'src/components/p-modal/PModal'

vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))

const apiMocks = vi.hoisted(() => ({
  apiJsonRequest: vi.fn(),
}))

vi.mock('src/features/api-json', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/api-json')>()
  return {
    ...actual,
    apiJsonRequest: apiMocks.apiJsonRequest,
  }
})

vi.mock('src/features/user-auth/app-session', () => ({
  readStoredAppSession: vi.fn(async () => null),
}))

const MAXIMUM_DESCRIPTION_LENGTH = 2000
const MAXIMUM_TITLE_LENGTH = 120

const createFeatureRequestSchema = z.object({
  description: z.string().trim().max(MAXIMUM_DESCRIPTION_LENGTH),
  title: z.string().trim().min(1).max(MAXIMUM_TITLE_LENGTH),
})

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
  apiMocks.apiJsonRequest.mockReset()
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} role="dialog">
      {props.children}
    </div>
  ))
})

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

it('should mirror the POST /api/feature-requests title and description limits in the form inputs', async () => {
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))

  const titleInput = screen.getByRole('textbox', {name: m.feature_request_title_label()})
  const descriptionInput = screen.getByRole('textbox', {name: m.feature_request_details_label()})

  expect(titleInput).toHaveAttribute('maxlength', String(MAXIMUM_TITLE_LENGTH))
  expect(descriptionInput).toHaveAttribute('maxlength', String(MAXIMUM_DESCRIPTION_LENGTH))
})

it('should not show the empty-title error when the API rejects an over-length title', async () => {
  const longTitle = '가'.repeat(MAXIMUM_TITLE_LENGTH + 1)
  expect(createFeatureRequestSchema.safeParse({description: '', title: longTitle}).success).toBe(
    false,
  )

  createRequest.mockResolvedValue({status: 'invalid'})
  render(() => <FeatureRequestForm authentication={authentication} model={model} />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  const titleInput = screen.getByRole('textbox', {name: m.feature_request_title_label()})
  fireEvent.input(titleInput, {target: {value: longTitle}})
  fireEvent.submit(titleInput.closest('form')!)

  await waitFor(() =>
    expect(createRequest).toHaveBeenCalledWith({description: '', title: longTitle}),
  )

  expect(screen.queryByText(m.feature_request_invalid())).not.toBeInTheDocument()
})

it('should classify API 400 responses from createFeatureRequest as invalid input', async () => {
  apiMocks.apiJsonRequest.mockResolvedValue(new Response(null, {status: 400}))

  await expect(
    createFeatureRequest({
      description: '',
      title: '가'.repeat(MAXIMUM_TITLE_LENGTH + 1),
    }),
  ).resolves.toEqual({status: 'invalid'})
})

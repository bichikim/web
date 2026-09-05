/** @vitest-environment jsdom */

import {useAction, useSubmission} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthController} from '../../../features/auth/controller'
import type {AuthenticationState} from '../../../features/auth/machine'
import {completeAccountLink} from '../../../features/user-auth/web-session'

const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))

vi.mock('@solidjs/router', async () => {
  const actual: typeof import('@solidjs/router') = await vi.importActual('@solidjs/router')
  return {...actual, action: vi.fn(), useAction: vi.fn(), useSubmission: vi.fn()}
})
vi.mock('../../../features/user-auth/web-session', () => ({
  completeAccountLink: vi.fn(),
  signOutWebSession: vi.fn(),
}))
vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: authMocks.useAuth}))

import {WebAccount} from '../WebAccount'

type MagicLinkResult = {readonly status: 'rejected' | 'sent' | 'unavailable'}
type SignOutResult = {readonly status: 'rejected' | 'signed-out' | 'unavailable'}

const [magicLinkPending, setMagicLinkPending] = createSignal(false)
const [magicLinkResult, setMagicLinkResult] = createSignal<MagicLinkResult | undefined>()
const [signOutPending, setSignOutPending] = createSignal(false)
const [signOutResult, setSignOutResult] = createSignal<SignOutResult | undefined>()
const [authenticationState, setAuthenticationState] = createSignal<AuthenticationState>({
  kind: 'anonymous',
})
const authenticationSession = () => {
  const state = authenticationState()
  return state.kind === 'authenticated' ? state : null
}
const authentication: AuthController = {
  session: authenticationSession,
  state: authenticationState,
}
const completeLinkSubmission = {
  clear: vi.fn(),
  error: undefined,
  input: [],
  pending: false,
  result: undefined,
  retry: vi.fn(),
  url: 'https://action/complete-user-account-link',
}
const magicLinkSubmission = {
  clear: vi.fn(),
  error: undefined,
  input: [],
  get pending() {
    return magicLinkPending()
  },
  get result() {
    return magicLinkResult()
  },
  retry: vi.fn(),
  url: 'https://action/request-account-magic-link',
}
const signOutSubmission = {
  clear: vi.fn(),
  error: undefined,
  input: [],
  get pending() {
    return signOutPending()
  },
  get result() {
    return signOutResult()
  },
  retry: vi.fn(),
  url: 'https://action/sign-out-account-session',
}
const requestMagicLink = vi.fn()
const signOut = vi.fn()
const completeLink = vi.fn((token: string) =>
  completeAccountLink(token).then((status) => ({status})),
)

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/account')
  setMagicLinkPending(false)
  setMagicLinkResult(undefined)
  setSignOutPending(false)
  setSignOutResult(undefined)
  setAuthenticationState({kind: 'anonymous'})
  authMocks.useAuth.mockReturnValue(authentication)
  requestMagicLink.mockReset()
  signOut.mockReset()
  vi.mocked(useAction)
    .mockReturnValueOnce(completeLink)
    .mockReturnValueOnce(requestMagicLink)
    .mockReturnValueOnce(signOut)
  vi.mocked(useSubmission)
    .mockReturnValueOnce(completeLinkSubmission as ReturnType<typeof useSubmission>)
    .mockReturnValueOnce(magicLinkSubmission as ReturnType<typeof useSubmission>)
    .mockReturnValueOnce(signOutSubmission as ReturnType<typeof useSubmission>)
})

it('should explain an email account-link callback failure and consume the query', async () => {
  window.history.replaceState(null, '', '/account?link_error=email')

  render(() => <WebAccount />)

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('계정 연결 이메일을 확인하지 못했습니다.')
  expect(screen.getByRole('alert').textContent).toContain('새 연결 이메일을 요청해 주세요.')
  expect(completeAccountLink).not.toHaveBeenCalled()
  expect(new URL(window.location.href).searchParams.has('link_error')).toBe(false)
})

it('should prefer a valid account-link token over a conflicting callback error', async () => {
  window.history.replaceState(null, '', '/account?link_token=challenge&link_error=email')
  vi.mocked(completeAccountLink).mockResolvedValue('linked')

  render(() => <WebAccount />)

  await waitFor(() => expect(screen.queryByRole('status')).not.toBeNull())
  expect(screen.getByRole('status').textContent).toContain('계정과 이메일 연결을 완료했습니다.')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(window.location.search).toBe('')
})

it('should preserve account-link failure guidance when session loading also fails', async () => {
  window.history.replaceState(null, '', '/account?link_error=email')
  setAuthenticationState({kind: 'unavailable'})

  render(() => <WebAccount />)

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('새 연결 이메일을 요청해 주세요.')
})

it('should show account-link failure guidance without waiting for session loading', async () => {
  window.history.replaceState(null, '', '/account?link_error=email')
  setAuthenticationState({kind: 'checking'})

  render(() => <WebAccount />)

  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('새 연결 이메일을 요청해 주세요.'),
  )
})

it('should not show account-link success when the linked session cannot be loaded', async () => {
  window.history.replaceState(null, '', '/account?link_token=challenge')
  vi.mocked(completeAccountLink).mockResolvedValue('linked')
  setAuthenticationState({kind: 'checking'})

  render(() => <WebAccount />)
  await waitFor(() => expect(completeAccountLink).toHaveBeenCalledWith('challenge'))
  setAuthenticationState({kind: 'unavailable'})

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('계정 정보를 불러오지 못했습니다.')
  expect(screen.queryByRole('status')).toBeNull()
})

it('should explain an expired account-link token and consume it', async () => {
  window.history.replaceState(null, '', '/account?link_token=expired')
  vi.mocked(completeAccountLink).mockResolvedValueOnce('invalid')

  render(() => <WebAccount />)

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(
      '계정 연결이 만료되었거나 다른 계정에 연결된 이메일입니다.',
    )
  })
  expect(completeAccountLink).toHaveBeenCalledWith('expired')
  expect(new URL(window.location.href).searchParams.has('link_token')).toBe(false)
})

it('should render email authentication as an action form', async () => {
  render(() => <WebAccount />)

  const button = await screen.findByRole('button', {name: '로그인 링크 받기'})
  const email = screen.getByLabelText('이메일')

  expect(button.closest('form')).toHaveAttribute('method', 'post')
  expect(button.closest('form')).toHaveAttribute('action', '/api/auth/sign-in/magic-link')
  expect(email).toHaveAttribute('name', 'email')

  fireEvent.input(email, {target: {value: 'user@example.com'}})
  fireEvent.submit(button.closest('form')!)

  expect(requestMagicLink).toHaveBeenCalledOnce()
  expect((requestMagicLink.mock.calls[0]?.[0] as FormData).get('email')).toBe('user@example.com')
})

it('should derive magic-link progress and feedback from its action submission', async () => {
  render(() => <WebAccount />)
  await screen.findByRole('button', {name: '로그인 링크 받기'})

  setMagicLinkPending(true)
  expect(screen.getByRole('button', {name: '이메일 전송 중…'})).toBeDisabled()

  setMagicLinkPending(false)
  setMagicLinkResult({status: 'sent'})
  expect(screen.getByRole('status')).toHaveTextContent('로그인 링크를 이메일로 보냈습니다.')

  setMagicLinkResult({status: 'rejected'})
  expect(screen.getByRole('alert')).toHaveTextContent('로그인 이메일을 보내지 못했습니다.')

  setMagicLinkResult({status: 'unavailable'})
  expect(screen.getByRole('alert')).toHaveTextContent('로그인 서버에 연결하지 못했습니다.')
})

it('should render an authenticated email session with a pending-aware sign-out action', async () => {
  setAuthenticationState({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })

  render(() => <WebAccount />)

  const email = await screen.findByText('user@example.com')
  const emailLabel = screen.getByText('로그인된 이메일')

  expect(email).toBeVisible()
  expect(emailLabel).toHaveClass('text-muted-foreground')
  expect(email.closest('div')).toHaveClass('border-border', 'bg-content-surface')
  const form = screen.getByRole('button', {name: '로그아웃'}).closest('form')

  expect(form).toHaveAttribute('method', 'post')
  expect(form).toHaveAttribute('action', '/api/auth/sign-out')

  setSignOutPending(true)
  expect(screen.getByRole('button', {name: '로그아웃'})).toBeDisabled()

  setSignOutPending(false)
  fireEvent.submit(form!)
  expect(signOut).toHaveBeenCalledOnce()
})

it('should consume a successful client sign-out action and show the anonymous state', async () => {
  setAuthenticationState({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  render(() => <WebAccount />)
  await screen.findByText('user@example.com')
  setSignOutResult({status: 'signed-out'})
  setAuthenticationState({kind: 'anonymous'})

  expect(await screen.findByRole('status')).toHaveTextContent('로그아웃했습니다.')
  expect(screen.getByRole('button', {name: '로그인 링크 받기'})).toBeEnabled()
})

it('should preserve an authenticated session after a rejected client sign-out action', async () => {
  setAuthenticationState({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })

  render(() => <WebAccount />)
  await screen.findByText('user@example.com')
  setSignOutResult({status: 'rejected'})

  expect(await screen.findByRole('alert')).toHaveTextContent('로그아웃하지 못했습니다.')
  expect(screen.getByText('user@example.com')).toBeVisible()
})

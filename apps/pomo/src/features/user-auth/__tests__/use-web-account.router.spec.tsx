/** @vitest-environment jsdom */

import {MemoryRouter, revalidate, useAction} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthController} from '../../auth/controller'
import type {AuthenticationState} from '../../auth/machine'
import {requestUserMagicLink} from '../magic-link'
import {readAccountSession, signOutWebSession} from '../web-session'

const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))

vi.mock('../../auth/AuthProvider', () => ({useAuth: authMocks.useAuth}))
vi.mock('../magic-link', () => ({requestUserMagicLink: vi.fn()}))
vi.mock('../web-session', () => ({
  completeAccountLink: vi.fn(),
  readAccountSession: vi.fn(),
  signOutWebSession: vi.fn(),
}))

import {requestAccountMagicLinkAction, signOutAccountSessionAction} from '../../auth/actions'
import {accountSessionQuery} from '../session-query'
import {useWebAccount} from '../use-web-account'

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

beforeEach(async () => {
  vi.clearAllMocks()
  setAuthenticationState({kind: 'anonymous'})
  authMocks.useAuth.mockReturnValue(authentication)
  await revalidate(accountSessionQuery.key)
})

const AccountFeedback = () => {
  const account = useWebAccount()

  return (
    <>
      <Show when={account.errorMessage()}>{(message) => <p role="alert">{message()}</p>}</Show>
      <Show when={account.successMessage()}>{(message) => <p role="status">{message()}</p>}</Show>
    </>
  )
}

const AccountSession = () => {
  const account = useWebAccount()
  return <p>{account.session()?.email ?? 'anonymous'}</p>
}

const RouterRoot = () => {
  const [isAccountVisible, setIsAccountVisible] = createSignal(true)
  const requestMagicLink = useAction(requestAccountMagicLinkAction)
  const signOut = useAction(signOutAccountSessionAction)

  const submit = () => {
    const values = new FormData()
    values.set('email', 'user@example.com')

    return requestMagicLink(values)
  }

  return (
    <>
      <button onClick={submit}>전송</button>
      <button onClick={() => signOut(new FormData())}>로그아웃</button>
      <button onClick={() => setIsAccountVisible((isVisible) => !isVisible)}>화면 전환</button>
      <Show when={isAccountVisible()}>
        <AccountFeedback />
      </Show>
    </>
  )
}

it('should not restore consumed failure feedback after remounting in the same router', async () => {
  vi.mocked(requestUserMagicLink).mockResolvedValue(false)
  vi.mocked(readAccountSession).mockResolvedValue(null)
  render(() => <MemoryRouter root={RouterRoot} />)

  fireEvent.click(screen.getByRole('button', {name: '전송'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('로그인 이메일을 보내지 못했습니다.')

  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))

  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})

it('should derive the displayed session from the authentication context', async () => {
  setAuthenticationState({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  vi.mocked(readAccountSession).mockResolvedValue(null)

  render(() => <MemoryRouter root={AccountSession} />)

  expect(await screen.findByText('user@example.com')).toBeVisible()
})

it('should not restore consumed sign-out feedback after remounting in the same router', async () => {
  setAuthenticationState({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  vi.mocked(signOutWebSession).mockResolvedValue(true)
  render(() => <MemoryRouter root={RouterRoot} />)

  fireEvent.click(screen.getByRole('button', {name: '로그아웃'}))
  expect(await screen.findByRole('status')).toHaveTextContent('로그아웃했습니다.')

  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))

  expect(screen.queryByRole('status')).toBeNull()
})

/** @vitest-environment jsdom */

import {MemoryRouter, revalidate, useAction} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {AuthController} from '../../auth/controller'
import type {AuthenticationState} from '../../auth/machine'
import {requestUserMagicLink} from '../magic-link'
import {readAccountSession, signOutWebSession} from '../web-session'

const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))

vi.mock('../../auth/AuthProvider', () => ({useAuth: authMocks.useAuth}))
vi.mock('../magic-link', () => ({requestUserMagicLink: vi.fn()}))
vi.mock('../web-session', async () => {
  const actual: typeof import('../web-session') = await vi.importActual('../web-session')
  return {...actual, readAccountSession: vi.fn(), signOutWebSession: vi.fn()}
})

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
  window.history.replaceState(null, '', '/account')
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

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/account')
})

it.each(['HTTP 503', 'network error'])(
  'should retain the token and retry after %s on remount',
  async (failure) => {
    const token = 'a'.repeat(32)
    const callbackUrl = `/account?link_token=${token}&link_error=email&from=settings#details`
    window.history.replaceState(null, '', callbackUrl)
    const fetchMock = vi.fn()

    if (failure === 'HTTP 503') {
      fetchMock.mockResolvedValueOnce(new Response(null, {status: 503}))
    } else {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    }

    fetchMock.mockResolvedValueOnce(new Response(null, {status: 200}))
    vi.stubGlobal('fetch', fetchMock)
    render(() => <MemoryRouter root={RouterRoot} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('계정 정보를 불러오지 못했습니다.')
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      callbackUrl,
    )
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/account/complete-link',
      expect.objectContaining({
        body: JSON.stringify({token}),
        credentials: 'include',
        method: 'POST',
      }),
    )

    fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
    fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))

    expect(await screen.findByRole('status')).toHaveTextContent(
      '계정과 이메일 연결을 완료했습니다.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/account/complete-link',
      expect.objectContaining({body: JSON.stringify({token})}),
    )
    expect(screen.queryByRole('alert')).toBeNull()
    expect(window.location.search + window.location.hash).toBe('?from=settings#details')

    fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
    fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  },
)

it.each([200, 409, 410])(
  'should consume a terminal HTTP %s token without retrying on remount',
  async (status) => {
    window.history.replaceState(
      null,
      '',
      `/account?link_token=${'a'.repeat(32)}&link_error=email&from=settings#details`,
    )
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status}))
    vi.stubGlobal('fetch', fetchMock)
    render(() => <MemoryRouter root={RouterRoot} />)

    if (status === 200) {
      expect(await screen.findByRole('status')).toHaveTextContent(
        '계정과 이메일 연결을 완료했습니다.',
      )
    } else {
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '계정 연결이 만료되었거나 다른 계정에 연결된 이메일입니다.',
      )
    }

    expect(window.location.search + window.location.hash).toBe('?from=settings#details')
    fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
    fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  },
)

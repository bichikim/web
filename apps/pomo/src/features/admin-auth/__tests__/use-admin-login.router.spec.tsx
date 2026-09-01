/** @vitest-environment jsdom */

import {MemoryRouter, useAction} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {requestAdminMagicLink} from '../magic-link'

vi.mock('../magic-link', () => ({requestAdminMagicLink: vi.fn()}))

import {requestAdminMagicLinkAction} from '../../auth/actions'
import {useAdminLogin} from '../use-admin-login'

const LoginFeedback = () => {
  const login = useAdminLogin()

  return (
    <>
      <Show when={login.errorMessage()}>{(message) => <p role="alert">{message()}</p>}</Show>
      <Show when={login.successMessage()}>{(message) => <p role="status">{message()}</p>}</Show>
    </>
  )
}

const RouterRoot = () => {
  const [isLoginVisible, setIsLoginVisible] = createSignal(true)
  const requestMagicLink = useAction(requestAdminMagicLinkAction)

  const submit = () => {
    const values = new FormData()
    values.set('email', 'admin@pomofi.io')

    return requestMagicLink(values)
  }

  return (
    <>
      <button onClick={submit}>전송</button>
      <button onClick={() => setIsLoginVisible((isVisible) => !isVisible)}>화면 전환</button>
      <Show when={isLoginVisible()}>
        <LoginFeedback />
      </Show>
    </>
  )
}

it('should not restore consumed success feedback after remounting in the same router', async () => {
  vi.mocked(requestAdminMagicLink).mockResolvedValue(true)
  render(() => <MemoryRouter root={RouterRoot} />)

  fireEvent.click(screen.getByRole('button', {name: '전송'}))
  expect(await screen.findByRole('status')).toHaveTextContent(
    '등록된 관리자 계정이라면 로그인 링크를 이메일로 보냈습니다.',
  )

  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))

  await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
})

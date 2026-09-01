/** @vitest-environment jsdom */

import {useAction, useSubmission} from '@solidjs/router'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({action: vi.fn(), useAction: vi.fn(), useSubmission: vi.fn()}))

import {AdminLogin} from '../AdminLogin'

const [pending, setPending] = createSignal(false)
const [result, setResult] = createSignal<
  {readonly status: 'rejected' | 'sent' | 'unavailable'} | undefined
>()
const submission = {
  get pending() {
    return pending()
  },
  get result() {
    return result()
  },
}
const requestMagicLink = vi.fn()

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setPending(false)
    setResult(undefined)
    requestMagicLink.mockReset()
    vi.mocked(useAction).mockReturnValue(requestMagicLink)
    vi.mocked(useSubmission).mockReturnValue(submission as ReturnType<typeof useSubmission>)
  })

  it('should submit administrator email through a named action form', () => {
    render(() => <AdminLogin />)

    const email = screen.getByRole('textbox', {name: '이메일'})
    const form = screen.getByRole('button', {name: '로그인 링크 받기'}).closest('form')

    expect(email).toHaveAttribute('name', 'email')
    expect(form).toHaveAttribute('method', 'post')
    expect(form).toHaveAttribute('action', '/api/auth/sign-in/magic-link')

    fireEvent.input(email, {target: {value: 'admin@pomofi.io'}})
    fireEvent.submit(form!)

    expect(requestMagicLink).toHaveBeenCalledOnce()
    expect(requestMagicLink.mock.calls[0]?.[0]).toBeInstanceOf(FormData)
    expect((requestMagicLink.mock.calls[0]?.[0] as FormData).get('email')).toBe('admin@pomofi.io')
  })

  it('should derive progress and sent feedback from the action submission', () => {
    render(() => <AdminLogin />)

    setPending(true)
    expect(screen.getByRole('button', {name: '이메일 전송 중…'})).toBeDisabled()

    setPending(false)
    setResult({status: 'sent'})
    expect(screen.getByRole('status')).toHaveTextContent(
      '등록된 관리자 계정이라면 로그인 링크를 이메일로 보냈습니다.',
    )
  })

  it.each([
    ['rejected', '로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'],
    ['unavailable', '로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'],
  ] as const)('should explain a %s action result', (status, message) => {
    render(() => <AdminLogin />)

    setResult({status})

    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })
})

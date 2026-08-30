/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {requestAdminMagicLink} from 'src/features/admin-auth/magic-link'
import {AdminLogin} from '../AdminLogin'

vi.mock('src/features/admin-auth/magic-link', () => ({requestAdminMagicLink: vi.fn()}))
vi.mock('@solidjs/meta', () => ({Title: () => null}))

const fillEmail = (value = 'admin@pomofi.io') => {
  fireEvent.input(screen.getByRole('textbox', {name: '이메일'}), {target: {value}})
}

const submit = () => {
  fireEvent.submit(screen.getByRole('button', {name: '로그인 링크 받기'}).closest('form')!)
}

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit the email, show progress, and confirm a sent login link', async () => {
    let resolveRequest: ((wasSent: boolean) => void) | undefined
    vi.mocked(requestAdminMagicLink).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    render(() => <AdminLogin />)
    fillEmail()
    submit()

    expect(screen.getByRole('button', {name: '이메일 전송 중…'})).toBeDisabled()
    expect(requestAdminMagicLink).toHaveBeenCalledWith({
      email: 'admin@pomofi.io',
      origin: window.location.origin,
    })

    resolveRequest?.(true)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        '등록된 관리자 계정이라면 로그인 링크를 이메일로 보냈습니다.',
      )
    })
    expect(screen.getByRole('button', {name: '로그인 링크 받기'})).toBeEnabled()
  })

  it('should explain when the magic link could not be sent', async () => {
    vi.mocked(requestAdminMagicLink).mockResolvedValueOnce(false)

    render(() => <AdminLogin />)
    fillEmail('not-sent@pomofi.io')
    submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('should explain when the login server request fails', async () => {
    vi.mocked(requestAdminMagicLink).mockRejectedValueOnce(new Error('network unavailable'))

    render(() => <AdminLogin />)
    fillEmail('offline@pomofi.io')
    submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    })
  })
})

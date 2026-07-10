/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ResetPassword} from '../ResetPassword'

const resetPassword = vi.fn()

vi.mock('src/store/auth', () => ({
  useAuth: () => ({
    resetPassword,
  }),
}))

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show an error when reset password fails', async () => {
    resetPassword.mockRejectedValueOnce(new Error('Rate limit exceeded'))

    render(() => <ResetPassword />)

    fireEvent.input(screen.getByLabelText('이메일 주소'), {
      target: {value: 'user@example.com'},
    })
    fireEvent.submit(screen.getByRole('button', {name: '재설정 링크 전송'}))

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    })
  })

  it('should show success when reset password succeeds', async () => {
    resetPassword.mockResolvedValueOnce(undefined)

    render(() => <ResetPassword />)

    fireEvent.input(screen.getByLabelText('이메일 주소'), {
      target: {value: 'user@example.com'},
    })
    fireEvent.submit(screen.getByRole('button', {name: '재설정 링크 전송'}))

    await waitFor(() => {
      expect(screen.getByText('이메일로 패스워드 재설정 링크를 전송했습니다.')).toBeInTheDocument()
    })
  })
})

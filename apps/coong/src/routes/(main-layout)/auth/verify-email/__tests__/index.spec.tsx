/**
 * @vitest-environment jsdom
 */
import {render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {JSX} from 'solid-js'
import VerifyEmailPage from '../index'

const verifyOtp = vi.fn()
const navigate = vi.fn()

vi.mock('src/store/auth', () => ({
  useAuth: () => ({
    user: () => null,
    verifyOtp,
  }),
}))

vi.mock('@solidjs/router', () => ({
  A: (props: {children: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
  useLocation: () => ({
    query: {
      token_hash: 'abc123',
      type: 'recovery',
    },
  }),
  useNavigate: () => navigate,
}))

vi.mock('@solidjs/start', () => ({
  clientOnly: () => () => null,
}))

vi.mock('src/use/countdown', () => ({
  useCountdown: () => ({
    count: () => 20_000,
    start: vi.fn(),
  }),
}))

vi.mock('src/components/text', () => ({
  SAuroraText: (props: {children: JSX.Element}) => <span>{props.children}</span>,
}))

vi.mock('./_components/tada.json?url', () => ({
  default: 'tada.json',
}))

vi.mock('./_components/bg.png', () => ({
  default: 'bg.png',
}))

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show an error when otp verification fails', async () => {
    verifyOtp.mockRejectedValueOnce(new Error('Token has expired or is invalid'))

    render(() => <VerifyEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('이메일 인증에 실패했습니다')).toBeInTheDocument()
      expect(screen.getByText('Token has expired or is invalid')).toBeInTheDocument()
    })

    expect(navigate).not.toHaveBeenCalled()
  })

  it('should redirect to change-password when recovery otp succeeds', async () => {
    verifyOtp.mockResolvedValueOnce(null)

    render(() => <VerifyEmailPage />)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/auth/change-password', {replace: true})
    })
  })
})

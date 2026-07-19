/**
 * @vitest-environment jsdom
 */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, waitFor} from '@solidjs/testing-library'
import VerifyEmailPage from '../index'
import {CHANGE_PASSWORD_PATH} from 'src/requests/auth/reset-password/redirect-url'

const navigate = vi.fn()
const verifyOtp = vi.fn()
const locationQuery = vi.fn(() => ({
  token_hash: 'recovery-hash',
  type: 'recovery',
}))

vi.mock('@solidjs/router', () => ({
  A: (props: {href: string; children: string}) => <a href={props.href}>{props.children}</a>,
  useLocation: () => ({
    query: locationQuery(),
  }),
  useNavigate: () => navigate,
}))

vi.mock('@solidjs/start', () => ({
  clientOnly: () => () => <div data-testid="lottie" />,
}))

vi.mock('src/store/auth', () => ({
  useAuth: () => ({
    user: () => ({email: 'user@example.com'}),
    verifyOtp,
  }),
}))

vi.mock('src/use/countdown', () => ({
  useCountdown: () => ({
    count: () => 20_000,
    start: vi.fn(),
  }),
}))

vi.mock('../_components/tada.json?url', () => ({
  default: 'tada.json',
}))

vi.mock('../_components/bg.png', () => ({
  default: 'bg.png',
}))

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    locationQuery.mockReturnValue({
      token_hash: 'recovery-hash',
      type: 'recovery',
    })
    verifyOtp.mockResolvedValue({id: 'user-1'})
  })

  it('should redirect to change-password after successful recovery verification', async () => {
    render(() => <VerifyEmailPage />)

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith({
        tokenHash: 'recovery-hash',
        type: 'recovery',
      })
      expect(navigate).toHaveBeenCalledWith(CHANGE_PASSWORD_PATH, {replace: true})
    })
  })

  it('should show an error instead of success when verification fails', async () => {
    verifyOtp.mockRejectedValueOnce(new Error('Token has expired or is invalid'))

    const {getByText} = render(() => <VerifyEmailPage />)

    await waitFor(() => {
      expect(getByText('인증에 실패했습니다')).toBeInTheDocument()
      expect(getByText('Token has expired or is invalid')).toBeInTheDocument()
      expect(getByText('패스워드 재설정 다시 시도')).toBeInTheDocument()
    })

    expect(navigate).not.toHaveBeenCalled()
  })

  it('should show an error when the verification link is missing required params', async () => {
    locationQuery.mockReturnValue({})

    const {getByText} = render(() => <VerifyEmailPage />)

    await waitFor(() => {
      expect(getByText('유효하지 않은 인증 링크입니다.')).toBeInTheDocument()
    })

    expect(verifyOtp).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})

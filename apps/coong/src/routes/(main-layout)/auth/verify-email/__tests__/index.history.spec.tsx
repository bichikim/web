/** @vitest-environment jsdom */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen, waitFor} from '@solidjs/testing-library'
import {Route, Router} from '@solidjs/router'
import VerifyEmailPage from '../index'

const verifyOtp = vi.fn()
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

describe('VerifyEmailPage browser history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/auth/verify-email?token_hash=once&type=signup')
    verifyOtp.mockResolvedValueOnce({id: 'user-1'}).mockRejectedValue(new Error('Already used'))
  })

  it('should restore success from browser history when the router remounts after refresh', async () => {
    const mount = () =>
      render(() => (
        <Router>
          <Route path="/auth/verify-email" component={VerifyEmailPage} />
        </Router>
      ))
    const page = mount()
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(window.history.state).toMatchObject({emailVerified: true})
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    page.unmount()
    mount()
    expect(await screen.findByText('user@example.com')).toBeInTheDocument()
    expect(screen.queryByText('인증에 실패했습니다')).not.toBeInTheDocument()
    expect(verifyOtp).toHaveBeenCalledTimes(1)
  })
})

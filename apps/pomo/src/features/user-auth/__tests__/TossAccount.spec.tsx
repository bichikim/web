/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

const navigate = vi.fn()
const sessionMocks = vi.hoisted(() => ({
  clearStoredAppSession: vi.fn(),
  createTossLoginSession: vi.fn(),
  readStoredAppSession: vi.fn(),
  requestAccountLinkEmail: vi.fn(),
  revokeTossLoginSession: vi.fn(),
  validateAppSession: vi.fn(),
}))

vi.mock('@solidjs/router', () => ({useNavigate: vi.fn()}))
vi.mock('../app-session', () => sessionMocks)

import {useNavigate} from '@solidjs/router'

import {TossAccount} from '../TossAccount'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useNavigate).mockReturnValue(navigate)
  sessionMocks.readStoredAppSession.mockResolvedValue('app-token')
  sessionMocks.validateAppSession.mockResolvedValue(true)
})

it('should return to Pomo without showing account linking after Toss login', async () => {
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
  sessionMocks.createTossLoginSession.mockResolvedValue('app-token')

  render(() => <TossAccount />)

  const loginButton = await screen.findByRole('button', {name: '토스로 시작하기'})
  fireEvent.click(loginButton)

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/ko/', {replace: true}))
  expect(screen.queryByLabelText('연결할 이메일')).toBeNull()
})

it('should preserve later navigation when Toss login finishes after unmount', async () => {
  const loginSession = Promise.withResolvers<string>()
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
  sessionMocks.createTossLoginSession.mockReturnValue(loginSession.promise)

  const result = render(() => <TossAccount />)
  fireEvent.click(await screen.findByRole('button', {name: '토스로 시작하기'}))
  await waitFor(() => expect(sessionMocks.createTossLoginSession).toHaveBeenCalledOnce())
  result.unmount()

  loginSession.resolve('app-token')
  await loginSession.promise
  await Promise.resolve()

  expect(navigate).not.toHaveBeenCalled()
})

it('should show the remaining delay when account link requests are rate limited', async () => {
  sessionMocks.requestAccountLinkEmail.mockResolvedValue({
    retryAfterSeconds: 42,
    status: 'rate-limited',
  })

  render(() => <TossAccount />)

  await waitFor(() => expect(screen.queryByLabelText('연결할 이메일')).not.toBeNull())
  fireEvent.input(screen.getByLabelText('연결할 이메일'), {
    target: {value: 'user@example.com'},
  })
  fireEvent.submit(screen.getByRole('button', {name: '웹 로그인 연결하기'}).closest('form')!)

  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('42초 후'))
})

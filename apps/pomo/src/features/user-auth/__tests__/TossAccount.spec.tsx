/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({
  clearStoredAppSession: vi.fn(),
  createTossLoginSession: vi.fn(),
  readStoredAppSession: vi.fn(),
  requestAccountLinkEmail: vi.fn(),
  revokeTossLoginSession: vi.fn(),
  validateAppSession: vi.fn(),
}))

vi.mock('../app-session', () => sessionMocks)

import {TossAccount} from '../TossAccount'

beforeEach(() => {
  vi.clearAllMocks()
  sessionMocks.readStoredAppSession.mockResolvedValue('app-token')
  sessionMocks.validateAppSession.mockResolvedValue(true)
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

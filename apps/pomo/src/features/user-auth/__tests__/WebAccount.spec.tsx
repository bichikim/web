/** @vitest-environment jsdom */

import {render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {requestUserMagicLink} from '../magic-link'
import {completeAccountLink, readAccountSession, signOutWebSession} from '../web-session'
import {WebAccount} from '../WebAccount'

vi.mock('../magic-link', () => ({requestUserMagicLink: vi.fn()}))
vi.mock('../web-session', () => ({
  completeAccountLink: vi.fn(),
  readAccountSession: vi.fn(),
  signOutWebSession: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/account')
  vi.mocked(requestUserMagicLink).mockResolvedValue(true)
  vi.mocked(readAccountSession).mockResolvedValue(null)
  vi.mocked(signOutWebSession).mockResolvedValue(true)
})

it('should explain an email account-link callback failure and consume the query', async () => {
  window.history.replaceState(null, '', '/account?link_error=email')

  render(() => <WebAccount />)

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('계정 연결 이메일을 확인하지 못했습니다.')
  expect(screen.getByRole('alert').textContent).toContain('새 연결 이메일을 요청해 주세요.')
  expect(completeAccountLink).not.toHaveBeenCalled()
  expect(new URL(window.location.href).searchParams.has('link_error')).toBe(false)
})

it('should prefer a valid account-link token over a conflicting callback error', async () => {
  window.history.replaceState(null, '', '/account?link_token=challenge&link_error=email')
  vi.mocked(completeAccountLink).mockResolvedValue('linked')

  render(() => <WebAccount />)

  await waitFor(() => expect(screen.queryByRole('status')).not.toBeNull())
  expect(screen.getByRole('status').textContent).toContain('계정과 이메일 연결을 완료했습니다.')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(window.location.search).toBe('')
})

it('should preserve account-link failure guidance when session loading also fails', async () => {
  window.history.replaceState(null, '', '/account?link_error=email')
  vi.mocked(readAccountSession).mockRejectedValue(new Error('unavailable'))

  render(() => <WebAccount />)

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('새 연결 이메일을 요청해 주세요.')
})

it('should show account-link failure guidance without waiting for session loading', async () => {
  window.history.replaceState(null, '', '/account?link_error=email')
  vi.mocked(readAccountSession).mockReturnValue(new Promise(() => {}))

  render(() => <WebAccount />)

  await waitFor(() => expect(readAccountSession).toHaveBeenCalled())
  expect(screen.getByRole('alert').textContent).toContain('새 연결 이메일을 요청해 주세요.')
})

it('should not show account-link success when the linked session cannot be loaded', async () => {
  window.history.replaceState(null, '', '/account?link_token=challenge')
  vi.mocked(completeAccountLink).mockResolvedValue('linked')
  vi.mocked(readAccountSession).mockRejectedValue(new Error('unavailable'))

  render(() => <WebAccount />)

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('계정 정보를 불러오지 못했습니다.')
  expect(screen.queryByRole('status')).toBeNull()
})

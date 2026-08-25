/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {requestUserMagicLink} from '../../../features/user-auth/magic-link'
import {
  completeAccountLink,
  readAccountSession,
  signOutWebSession,
} from '../../../features/user-auth/web-session'
import {WebAccount} from '../WebAccount'

vi.mock('../../../features/user-auth/magic-link', () => ({requestUserMagicLink: vi.fn()}))
vi.mock('../../../features/user-auth/web-session', () => ({
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

it('should explain an expired account-link token and consume it', async () => {
  window.history.replaceState(null, '', '/account?link_token=expired')
  vi.mocked(completeAccountLink).mockResolvedValueOnce('invalid')

  render(() => <WebAccount />)

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(
      '계정 연결이 만료되었거나 다른 계정에 연결된 이메일입니다.',
    )
  })
  expect(completeAccountLink).toHaveBeenCalledWith('expired')
  expect(new URL(window.location.href).searchParams.has('link_token')).toBe(false)
})

it('should show the signed-out email entry form after loading no session', async () => {
  render(() => <WebAccount />)

  expect(await screen.findByRole('button', {name: '로그인 링크 받기'})).toBeEnabled()
  expect(screen.getByLabelText('이메일')).toHaveValue('')
})

it('should show submission progress and confirmation for a sent magic link', async () => {
  const magicLink = Promise.withResolvers<boolean>()
  vi.mocked(requestUserMagicLink).mockReturnValueOnce(magicLink.promise)

  render(() => <WebAccount />)

  const emailField = await screen.findByLabelText('이메일')
  fireEvent.input(emailField, {target: {value: 'user@example.com'}})
  fireEvent.submit(screen.getByRole('button', {name: '로그인 링크 받기'}).closest('form')!)
  expect(screen.getByRole('button', {name: '이메일 전송 중…'})).toBeDisabled()

  magicLink.resolve(true)

  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent('로그인 링크를 이메일로 보냈습니다.')
  })
  expect(requestUserMagicLink).toHaveBeenCalledWith({
    email: 'user@example.com',
    origin: window.location.origin,
  })
})

it('should explain rejected and failed magic-link requests', async () => {
  vi.mocked(requestUserMagicLink)
    .mockResolvedValueOnce(false)
    .mockRejectedValueOnce(new Error('server unavailable'))

  render(() => <WebAccount />)

  const emailField = await screen.findByLabelText('이메일')
  fireEvent.input(emailField, {target: {value: 'user@example.com'}})
  const form = screen.getByRole('button', {name: '로그인 링크 받기'}).closest('form')!

  fireEvent.submit(form)
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('로그인 이메일을 보내지 못했습니다.')
  })

  fireEvent.submit(form)
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('로그인 서버에 연결하지 못했습니다.')
  })
})

it('should show the active account and confirm a successful sign-out', async () => {
  const signOut = Promise.withResolvers<boolean>()
  vi.mocked(readAccountSession).mockResolvedValueOnce({email: 'user@example.com'})
  vi.mocked(signOutWebSession).mockReturnValueOnce(signOut.promise)

  render(() => <WebAccount />)

  expect(await screen.findByText('user@example.com')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '로그아웃'}))
  expect(screen.getByRole('button', {name: '로그아웃'})).toBeDisabled()

  signOut.resolve(true)

  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent('로그아웃했습니다.')
  })
  expect(screen.getByRole('button', {name: '로그인 링크 받기'})).toBeEnabled()
})

it('should keep the account open when sign-out cannot be confirmed', async () => {
  vi.mocked(readAccountSession).mockResolvedValueOnce({email: 'user@example.com'})
  vi.mocked(signOutWebSession).mockResolvedValueOnce(false)

  render(() => <WebAccount />)

  fireEvent.click(await screen.findByRole('button', {name: '로그아웃'}))

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('로그아웃하지 못했습니다.')
  })
  expect(screen.getByText('user@example.com')).toBeVisible()
})

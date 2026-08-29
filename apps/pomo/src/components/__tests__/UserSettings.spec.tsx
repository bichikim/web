/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {render, screen, waitFor} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {readStoredAppSession, validateAppSession} from '../../features/user-auth/app-session'
import {readAccountSession} from '../../features/user-auth/web-session'
import {UserSettings} from '../UserSettings'

vi.mock('@kobalte/core/tabs', () => ({Tabs: {Content: vi.fn()}}))
vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children?: JSX.Element; readonly class?: string; readonly href: string}) => (
    <a class={props.class} href={props.href}>
      {props.children}
    </a>
  ),
}))
vi.mock('../../features/user-auth/app-session', () => ({
  clearStoredAppSession: vi.fn(),
  readStoredAppSession: vi.fn(),
  validateAppSession: vi.fn(),
}))
vi.mock('../../features/user-auth/web-session', () => ({readAccountSession: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  vi.mocked(Tabs.Content).mockImplementation((props) => <>{props.children}</>)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should show the signed-in email and account management entry', async () => {
  vi.mocked(readAccountSession).mockResolvedValue({email: 'pomo@example.com'})

  render(() => <UserSettings />)

  expect(screen.queryByText('Pomo account')).toBeNull()
  expect(screen.queryByRole('heading', {name: '사용자'})).toBeNull()
  expect(screen.queryByText('현재 로그인 상태와 연결된 계정을 확인할 수 있어요.')).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('계정 확인 중…')
  await waitFor(() => expect(screen.queryByText('pomo@example.com')).not.toBeNull())
  expect(screen.queryByText('이메일 링크')).not.toBeNull()
  const accountLink = screen.getByRole('link', {name: '계정 관리'})
  expect(accountLink.getAttribute('href')).toBe('/ko/account/')
  expect(accountLink.className).toContain('rounded-control')
  expect(accountLink.className).toContain('border-highlight')
})

it('should provide the login entry for an anonymous user', async () => {
  vi.mocked(readAccountSession).mockResolvedValue(null)

  render(() => <UserSettings />)

  await waitFor(() => expect(screen.queryByText('로그인하지 않았어요.')).not.toBeNull())
  expect(screen.getByText('로그인하지 않았어요.').closest('div.rounded-panel')).not.toBeNull()
  expect(screen.getByRole('link', {name: '로그인 / 가입'}).getAttribute('href')).toBe(
    '/ko/account/',
  )
  expect(screen.getByRole('link', {name: '서비스 이용약관'}).getAttribute('href')).toBe(
    '/web/terms',
  )
  expect(screen.getByRole('link', {name: '개인정보처리방침'}).getAttribute('href')).toBe(
    '/web/privacy',
  )
  expect(screen.queryByRole('link', {name: '환불 및 청약철회 정책'})).toBeNull()
  expect(screen.getByRole('heading', {name: '서비스 정보'}).parentElement?.className).toContain(
    'border-t',
  )
})

it('should show the Toss login method for an app session', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  vi.mocked(readStoredAppSession).mockResolvedValue('app-session')
  vi.mocked(validateAppSession).mockResolvedValue(true)

  render(() => <UserSettings />)

  await waitFor(() => expect(screen.queryByText('토스')).not.toBeNull())
  expect(screen.queryByText('로그인됨')).not.toBeNull()
  expect(
    screen.getByRole('link', {name: '이메일 추가해서 웹에서도 로그인하기'}).getAttribute('href'),
  ).toBe('/ko/account/')
  expect(readAccountSession).not.toHaveBeenCalled()
})

it('should distinguish an account service failure from an anonymous session', async () => {
  vi.mocked(readAccountSession).mockRejectedValue(new Error('unavailable'))

  render(() => <UserSettings />)

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('로그인 상태를 확인하지 못했습니다.')
})

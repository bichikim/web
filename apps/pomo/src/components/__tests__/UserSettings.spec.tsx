/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {
  UserSettingsController,
  UserSettingsState,
} from '../../features/user-auth/use-user-settings'

const settingsMocks = vi.hoisted(() => ({useUserSettings: vi.fn()}))

vi.mock('@kobalte/core/tabs', () => ({Tabs: {Content: vi.fn()}}))
vi.mock('@solidjs/router', async () => {
  const actual: typeof import('@solidjs/router') = await vi.importActual('@solidjs/router')
  return {
    ...actual,
    A: (props: {
      readonly children?: JSX.Element
      readonly class?: string
      readonly href: string
    }) => (
      <a class={props.class} href={props.href}>
        {props.children}
      </a>
    ),
  }
})
vi.mock('../../features/user-auth/use-user-settings', () => ({
  useUserSettings: settingsMocks.useUserSettings,
}))

import {UserSettings} from '../UserSettings'

const [settingsState, setSettingsState] = createSignal<UserSettingsState>({kind: 'loading'})
const authenticatedUser = () => {
  const state = settingsState()
  return state.kind === 'authenticated' ? state : null
}
const settings: UserSettingsController = {
  authenticatedEmail: () => {
    const account = authenticatedUser()
    return account?.provider === 'email' ? account.email : null
  },
  authenticatedUser,
  state: settingsState,
}

beforeEach(() => {
  vi.clearAllMocks()
  setSettingsState({kind: 'loading'})
  settingsMocks.useUserSettings.mockReturnValue(settings)
  vi.mocked(Tabs.Content).mockImplementation((props) => <>{props.children}</>)
})

it('should show the signed-in email and account management entry', async () => {
  render(() => <UserSettings />)

  expect(screen.queryByText('Pomo account')).toBeNull()
  expect(screen.queryByRole('heading', {name: '사용자'})).toBeNull()
  expect(screen.queryByText('현재 로그인 상태와 연결된 계정을 확인할 수 있어요.')).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('계정 확인 중…')
  setSettingsState({
    email: 'pomo@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  await waitFor(() => expect(screen.queryByText('pomo@example.com')).not.toBeNull())
  expect(screen.queryByText('이메일 링크')).not.toBeNull()
  const accountLink = screen.getByRole('link', {name: '계정 관리'})
  expect(accountLink.getAttribute('href')).toBe('/account')
  expect(accountLink.className).toContain('rounded-control')
  expect(accountLink.className).toContain('border-highlight')
})

it('should provide the login entry for an anonymous user', async () => {
  setSettingsState({kind: 'anonymous'})

  render(() => <UserSettings />)

  await waitFor(() => expect(screen.queryByText('로그인하지 않았어요.')).not.toBeNull())
  expect(screen.getByText('로그인하지 않았어요.').closest('div.rounded-panel')).not.toBeNull()
  expect(screen.getByRole('link', {name: '로그인 / 가입'}).getAttribute('href')).toBe('/account')
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
  setSettingsState({kind: 'authenticated', provider: 'toss'})

  render(() => <UserSettings />)

  await waitFor(() => expect(screen.queryByText('토스')).not.toBeNull())
  expect(screen.queryByText('로그인됨')).not.toBeNull()
  expect(
    screen.getByRole('link', {name: '이메일 추가해서 웹에서도 로그인하기'}).getAttribute('href'),
  ).toBe('/account')
})

it('should distinguish an account service failure from an anonymous session', async () => {
  setSettingsState({kind: 'error'})

  render(() => <UserSettings />)

  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('로그인 상태를 확인하지 못했습니다.')
})

import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

import {useAuth} from '../../../features/auth/AuthProvider'
import type {AuthenticationState} from '../../../features/auth/machine'
import {listCalendarConnections} from '../../../features/calendar'
import {CalendarConnections} from '../CalendarConnections'

vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: vi.fn()}))
vi.mock('../../../features/calendar', () => ({
  authorizeCalendarConnection: vi.fn(),
  deleteCalendarConnection: vi.fn(),
  listCalendarConnections: vi.fn(),
}))

const originalGetLocale = getLocale

afterEach(() => {
  cleanup()
  overwriteGetLocale(originalGetLocale)
  vi.resetAllMocks()
})

it('should show the correct auth and API notices in the native settings popover', async () => {
  overwriteGetLocale(() => 'ko')
  const [state, setState] = createSignal<AuthenticationState>({kind: 'checking'})
  vi.mocked(useAuth).mockReturnValue({
    session: () => {
      const current = state()
      return current.kind === 'authenticated' ? current : null
    },
    state,
  })
  vi.mocked(listCalendarConnections).mockRejectedValueOnce(new Error('Calendar unavailable'))
  const view = render(() => createComponent(CalendarConnections, {}))
  const popover = view.container.querySelector<HTMLElement>('[popover]')!

  await page.getByRole('button', {name: '캘린더 연결 설정'}).click()
  await expect.element(page.getByText('캘린더 연결 확인 중…')).toBeVisible()
  expect(listCalendarConnections).not.toHaveBeenCalled()

  setState({kind: 'unavailable'})
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('로그인 상태를 확인하지 못했습니다. 계정 화면에서 다시 시도해 주세요.')
  expect(listCalendarConnections).not.toHaveBeenCalled()
  await expect
    .element(page.getByRole('button', {name: 'Google Calendar 연결'}))
    .not.toBeInTheDocument()

  setState({email: 'first@example.com', kind: 'authenticated', provider: 'email'})
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('캘린더 연결을 확인하지 못했습니다.')
  expect(listCalendarConnections).toHaveBeenCalledTimes(1)

  setState({kind: 'anonymous'})
  await expect.element(page.getByText('캘린더에 연결하기 위해 로그인하세요.')).toBeVisible()
  await expect.element(page.getByRole('alert')).not.toBeInTheDocument()

  vi.mocked(listCalendarConnections).mockResolvedValue([
    {accountLabel: 'person@example.com', id: 'connection-1', provider: 'google'},
  ])
  setState({email: 'second@example.com', kind: 'authenticated', provider: 'email'})
  await expect
    .element(page.getByRole('button', {name: 'person@example.com 연결 해제'}))
    .toBeVisible()
  expect(listCalendarConnections).toHaveBeenCalledTimes(2)
  await expect.element(page.getByRole('alert')).not.toBeInTheDocument()

  await userEvent.keyboard('{Escape}')
  await expect.poll(() => popover.matches(':popover-open')).toBe(false)
})

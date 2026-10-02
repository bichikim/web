/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useAuth} from '../../../features/auth/AuthProvider'
import {listCalendarEvents} from '../../../features/calendar'
import {CalendarMonth} from '../CalendarMonth'

vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: vi.fn()}))
vi.mock('../../../features/calendar', async () => {
  const actual = await vi.importActual('../../../features/calendar')
  return {...actual, listCalendarEvents: vi.fn()}
})
vi.mock('../../../features/memory-assist', () => ({useMemoryMemos: () => () => []}))
vi.mock('../Grid', () => ({CalendarGrid: () => <div />}))
vi.mock('../Header', () => ({CalendarHeader: () => <header />}))
vi.mock('../../calendar-alarm-control/CalendarAlarmControl', () => ({
  CalendarAlarmControl: () => <button type="button" />,
}))

const originalGetLocale = getLocale

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    session: () => ({email: 'person@example.com', kind: 'authenticated', provider: 'email'}),
    state: () => ({email: 'person@example.com', kind: 'authenticated', provider: 'email'}),
  })
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 8, 4, 12))
  overwriteGetLocale(() => 'ko')
  vi.mocked(listCalendarEvents).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: true,
    unavailableConnections: 0,
  })
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
  vi.useRealTimers()
})

it('should show a notice when only part of the calendar could be loaded', async () => {
  render(() => <CalendarMonth />)

  expect(
    await screen.findByText(
      '일정이 많아 일부만 표시하고 있어요. 전체 일정은 연결된 캘린더에서 확인해 주세요.',
    ),
  ).toBeVisible()
})

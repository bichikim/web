/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type CalendarEvents,
  listCalendarEvents,
  readCalendarMonthCache,
  writeCalendarMonthCache,
} from '../../features/calendar'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import type {AuthenticationState} from '../../features/auth/machine'
import {useAuth} from '../../features/auth/AuthProvider'
import {CalendarMonth} from '../CalendarMonth'

vi.mock('../../features/calendar', async () => {
  const actual = await vi.importActual('../../features/calendar')
  return {...actual, listCalendarEvents: vi.fn()}
})
vi.mock('../CalendarAlarmControl', () => ({
  CalendarAlarmControl: (props: {event: {title: string}}) => (
    <button type="button">{props.event.title} 알람 설정</button>
  ),
}))

const originalGetLocale = getLocale

it('should show a notice when only part of the calendar could be loaded', async () => {
  vi.mocked(listCalendarEvents).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: true,
    unavailableConnections: 0,
  })
  render(() => <CalendarMonth />)
  expect(
    await screen.findByText(
      '일정이 많아 일부만 표시하고 있어요. 전체 일정은 연결된 캘린더에서 확인해 주세요.',
    ),
  ).toBeVisible()
})

vi.mock('../../features/auth/AuthProvider', () => ({useAuth: vi.fn()}))

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    session: () => ({kind: 'authenticated', provider: 'toss'}),
    state: () => ({kind: 'authenticated', provider: 'toss'}),
  })
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date('2026-09-04T03:00:00.000Z'))
  overwriteGetLocale(() => 'ko')
  vi.mocked(listCalendarEvents).mockResolvedValue({
    connectedConnections: 1,
    events: [
      {
        accountLabel: 'person@example.com',
        allDay: false,
        calendarLabel: '업무',
        end: '2026-09-04T02:00:00.000Z',
        id: 'meeting',
        provider: 'google',
        start: '2026-09-04T01:00:00.000Z',
        title: '팀 회의',
      },
      {
        accountLabel: 'person@example.com',
        allDay: true,
        calendarLabel: '개인',
        end: '2026-09-06',
        id: 'holiday',
        provider: 'google',
        start: '2026-09-05',
        title: '휴가',
      },
    ],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
  vi.useRealTimers()
})

it('should show a navigable month and the selected day events', async () => {
  render(() => <CalendarMonth settings={<button type="button">캘린더 설정</button>} />)

  expect(await screen.findByRole('heading', {name: '2026년 9월'})).toBeVisible()
  expect(screen.getAllByRole('columnheader').map((heading) => heading.textContent)).toEqual([
    '일',
    '월',
    '화',
    '수',
    '목',
    '금',
    '토',
  ])
  const selectedDay = await screen.findByRole('button', {
    name: '2026년 9월 4일, 일정 1개',
  })
  expect(selectedDay).toHaveAttribute('aria-pressed', 'true')
  expect(selectedDay).toHaveClass('rounded-panel-inner')
  expect(selectedDay).not.toHaveClass('rounded-control')
  expect(within(selectedDay).getByText('팀 회의')).toBeVisible()
  expect(screen.getByRole('button', {name: '캘린더 설정'}).previousElementSibling).toBe(
    screen.getByRole('navigation', {name: '캘린더 월 이동'}),
  )
  expect(screen.getAllByText('팀 회의')).toHaveLength(2)

  fireEvent.click(screen.getByRole('button', {name: '2026년 9월 5일, 일정 1개'}))
  const selectedAgenda = screen.getByRole('region', {name: '2026년 9월 5일'})
  expect(within(selectedAgenda).queryByText('팀 회의')).not.toBeInTheDocument()
  const holiday = within(selectedAgenda).getByText('휴가')
  const eventList = within(selectedAgenda).getByRole('list')
  expect(holiday).toBeVisible()
  expect(holiday.closest('li')).toHaveClass('rounded-panel-inner')
  expect(within(selectedAgenda).getByRole('button', {name: '휴가 알람 설정'})).toBeVisible()
  expect(eventList).toHaveClass('overflow-y-auto', 'overscroll-contain')
  expect(eventList.className).toContain('max-h-[min(18rem,35dvh)]')
  expect(eventList).toHaveAttribute('tabindex', '0')
  expect(within(selectedAgenda).getByText('종일')).toBeVisible()

  fireEvent.click(screen.getByRole('button', {name: '다음 달'}))
  await waitFor(() => expect(listCalendarEvents).toHaveBeenCalledTimes(2))
  expect(screen.getByRole('heading', {name: '2026년 10월'})).toBeVisible()
})

it('should explain empty and partially unavailable calendar results', async () => {
  vi.mocked(listCalendarEvents).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 1,
  })

  render(() => <CalendarMonth />)

  expect(await screen.findByText('선택한 날짜에 일정이 없습니다.')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent(
    '일부 캘린더를 불러오지 못해 일정이 누락되었을 수 있습니다.',
  )
})

it('should show calendar loading failures', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(listCalendarEvents).mockRejectedValue(new Error('calendar unavailable'))

  render(() => <CalendarMonth />)

  expect(await screen.findByRole('alert')).toHaveTextContent('일정을 불러오지 못했습니다.')
})

it('should show cached events before replacing them with refreshed events', async () => {
  const currentMonth = new Date(2026, 8, 1)
  const range = {
    end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toISOString(),
    start: currentMonth.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
  const cachedCalendar: CalendarEvents = {
    connectedConnections: 1,
    events: [
      {
        accountLabel: 'person@example.com',
        allDay: false,
        calendarLabel: '업무',
        end: '2026-09-04T02:00:00.000Z',
        id: 'cached-meeting',
        provider: 'google',
        start: '2026-09-04T01:00:00.000Z',
        title: '저장된 회의',
      },
    ],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  }
  writeCalendarMonthCache(range, cachedCalendar)
  let resolveRefresh: ((value: CalendarEvents) => void) | undefined
  vi.mocked(listCalendarEvents).mockReturnValue(
    new Promise((resolve) => {
      resolveRefresh = resolve
    }),
  )

  render(() => <CalendarMonth />)

  expect(screen.getAllByText('저장된 회의')).toHaveLength(2)
  expect(listCalendarEvents).toHaveBeenCalledOnce()

  resolveRefresh?.({
    ...cachedCalendar,
    events: [{...cachedCalendar.events[0], id: 'fresh-meeting', title: '최신 회의'}],
  })

  expect(await screen.findAllByText('최신 회의')).toHaveLength(2)
  expect(screen.queryByText('저장된 회의')).not.toBeInTheDocument()
})

it('should retain cached events when the background refresh fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const currentMonth = new Date(2026, 8, 1)
  writeCalendarMonthCache(
    {
      end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toISOString(),
      start: currentMonth.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    {
      connectedConnections: 1,
      events: [
        {
          accountLabel: 'person@example.com',
          allDay: false,
          calendarLabel: '업무',
          end: '2026-09-04T02:00:00.000Z',
          id: 'cached-meeting',
          provider: 'google',
          start: '2026-09-04T01:00:00.000Z',
          title: '저장된 회의',
        },
      ],
      timeZone: 'Asia/Seoul',
      truncated: false,
      unavailableConnections: 0,
    },
  )
  vi.mocked(listCalendarEvents).mockRejectedValue(new Error('calendar unavailable'))

  render(() => <CalendarMonth />)

  expect(screen.getAllByText('저장된 회의')).toHaveLength(2)
  expect(await screen.findByRole('status')).toHaveTextContent(
    '최신 일정을 가져오지 못해 저장된 일정을 표시하고 있습니다.',
  )
  expect(screen.getAllByText('저장된 회의')).toHaveLength(2)
})

it('should reload events when calendar connections change', async () => {
  const [revision, setRevision] = createSignal(0)
  render(() => <CalendarMonth revision={revision()} />)
  await waitFor(() => expect(listCalendarEvents).toHaveBeenCalledTimes(1))

  setRevision(1)

  await waitFor(() => expect(listCalendarEvents).toHaveBeenCalledTimes(2))
})

it('should not let an obsolete refresh overwrite the latest month cache', async () => {
  const firstRefresh = Promise.withResolvers<CalendarEvents>()
  const secondRefresh = Promise.withResolvers<CalendarEvents>()
  const [revision, setRevision] = createSignal(0)
  const currentMonth = new Date(2026, 8, 1)
  const range = {
    end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toISOString(),
    start: currentMonth.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
  const freshCalendar: CalendarEvents = {
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  }
  const obsoleteCalendar: CalendarEvents = {
    ...freshCalendar,
    events: [
      {
        accountLabel: 'old@example.com',
        allDay: true,
        calendarLabel: '이전 캘린더',
        end: '2026-09-05',
        id: 'obsolete-event',
        provider: 'google',
        start: '2026-09-04',
        title: '삭제된 연결의 일정',
      },
    ],
  }
  vi.mocked(listCalendarEvents)
    .mockReturnValueOnce(firstRefresh.promise)
    .mockReturnValueOnce(secondRefresh.promise)

  render(() => <CalendarMonth revision={revision()} />)
  await waitFor(() => expect(listCalendarEvents).toHaveBeenCalledOnce())
  setRevision(1)
  await waitFor(() => expect(listCalendarEvents).toHaveBeenCalledTimes(2))

  secondRefresh.resolve(freshCalendar)
  await waitFor(() => expect(readCalendarMonthCache(range)).toEqual(freshCalendar))
  firstRefresh.resolve(obsoleteCalendar)
  await firstRefresh.promise

  expect(readCalendarMonthCache(range)).toEqual(freshCalendar)
})

it('should request login without fetching calendars when signed out', async () => {
  vi.mocked(useAuth).mockReturnValue({
    session: () => null,
    state: () => ({kind: 'anonymous'}),
  })
  render(() => <CalendarMonth />)

  expect(
    await screen.findByText('일정을 불러오기 위해 로그인하고 캘린더를 연결하세요.'),
  ).toBeVisible()
  expect(listCalendarEvents).not.toHaveBeenCalled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('should load after login and restore the login notice after logout', async () => {
  const [state, setState] = createSignal<AuthenticationState>({kind: 'anonymous'})
  vi.mocked(useAuth).mockReturnValue({
    session: () => {
      const current = state()
      return current.kind === 'authenticated' ? current : null
    },
    state,
  })
  render(() => <CalendarMonth />)
  expect(screen.getByText('일정을 불러오기 위해 로그인하고 캘린더를 연결하세요.')).toBeVisible()

  setState({kind: 'authenticated', provider: 'toss'})
  await waitFor(() => expect(listCalendarEvents).toHaveBeenCalledTimes(1))
  expect(await screen.findByText('팀 회의', {selector: 'p'})).toBeVisible()
  expect(
    screen.queryByText('일정을 불러오기 위해 로그인하고 캘린더를 연결하세요.'),
  ).not.toBeInTheDocument()

  setState({kind: 'anonymous'})
  expect(
    await screen.findByText('일정을 불러오기 위해 로그인하고 캘린더를 연결하세요.'),
  ).toBeVisible()
  expect(screen.queryByText('팀 회의')).not.toBeInTheDocument()
})

it('should not restore the previous session events while a new login is loading', async () => {
  const [state, setState] = createSignal<AuthenticationState>({
    kind: 'authenticated',
    provider: 'toss',
  })
  vi.mocked(useAuth).mockReturnValue({
    session: () => {
      const current = state()
      return current.kind === 'authenticated' ? current : null
    },
    state,
  })
  render(() => <CalendarMonth />)
  expect(await screen.findByText('팀 회의', {selector: 'p'})).toBeVisible()

  setState({kind: 'anonymous'})
  sessionStorage.clear()
  vi.mocked(listCalendarEvents).mockImplementationOnce(() => new Promise(() => {}))
  setState({kind: 'authenticated', provider: 'toss'})
  await waitFor(() => expect(listCalendarEvents).toHaveBeenCalledTimes(2))
  expect(screen.queryByText('팀 회의', {selector: 'p'})).not.toBeInTheDocument()
})

it.each([
  {allDay: true, end: '2026-09-06', start: '2026-09-03'},
  {allDay: true, end: '2026-09-06', start: '2026-08-31'},
  {allDay: false, end: '2026-09-04T02:00:00.000Z', start: '2026-09-03T14:00:00.000Z'},
])('should display a spanning event on a covered date after $start', async (range) => {
  vi.mocked(listCalendarEvents).mockResolvedValue({
    connectedConnections: 1,
    events: [
      {
        ...range,
        accountLabel: 'test@example.com',
        calendarLabel: 'test',
        id: 'spanning',
        provider: 'google',
        title: '계속되는 일정',
      },
    ],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })
  render(() => <CalendarMonth />)
  await waitFor(() => expect(screen.queryByText('일정을 불러오는 중…')).not.toBeInTheDocument())
  const agenda = screen.getByRole('region', {name: '2026년 9월 4일'})
  expect(within(agenda).getByText('계속되는 일정')).toBeVisible()
  expect(within(agenda).getByRole('button', {name: '계속되는 일정 알람 설정'})).toBeVisible()
  expect(screen.getByRole('button', {name: '2026년 9월 4일, 일정 1개'})).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '2026년 9월 6일, 일정 0개'}))
  expect(
    within(screen.getByRole('region', {name: '2026년 9월 6일'})).getByText(
      '선택한 날짜에 일정이 없습니다.',
    ),
  ).toBeVisible()
})

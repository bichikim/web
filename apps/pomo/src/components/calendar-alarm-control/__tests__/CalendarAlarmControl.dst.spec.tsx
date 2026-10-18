/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {event, mocks, setupCalendarAlarmControl} from './fixtures/setup'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

interface AlarmInput {
  readonly date: string
  readonly now: string
  readonly time: string
  readonly timeZone: string
}

const popoverMethodNames = ['hidePopover', 'showPopover', 'matches'] as const
const popoverMethodDescriptors = new Map(
  popoverMethodNames.map((name) => [
    name,
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
  ]),
)

setupCalendarAlarmControl()

afterEach(() => {
  vi.useRealTimers()
  for (const name of popoverMethodNames) {
    const descriptor = popoverMethodDescriptors.get(name)
    if (descriptor === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, name)
    } else {
      Object.defineProperty(HTMLElement.prototype, name, descriptor)
    }
  }
})

const submitAlarm = ({date, now, time, timeZone}: AlarmInput) => {
  render(() => (
    <CalendarAlarmControl
      now={() => new Date(now)}
      event={event}
      memos={() => mocks.memos}
      timeZone={timeZone}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  fireEvent.input(screen.getByLabelText('날짜'), {target: {value: date}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: time}})
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
}

it.each([
  {
    date: '2026-03-08',
    now: '2026-03-08T04:00:00.000Z',
    time: '02:30',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-10-04',
    now: '2026-10-03T12:00:00.000Z',
    time: '02:15',
    timeZone: 'Australia/Lord_Howe',
  },
])('should reject a nonexistent $time wall time in $timeZone', ({date, now, time, timeZone}) => {
  submitAlarm({date, now, time, timeZone})

  expect(mocks.updateMemos).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toHaveTextContent('현재보다 뒤의 날짜와 시간을 선택해 주세요.')
  expect(localStorage.getItem('pomo:memory-memos:v1')).toBeNull()
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
  expect(mocks.deleteAudio).not.toHaveBeenCalled()
})

it.each([
  {
    date: '2026-03-08',
    expected: '2026-03-08T06:59:00.000Z',
    now: '2026-03-08T04:00:00.000Z',
    time: '01:59',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-03-08',
    expected: '2026-03-08T07:00:00.000Z',
    now: '2026-03-08T04:00:00.000Z',
    time: '03:00',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-10-04',
    expected: '2026-10-03T15:29:00.000Z',
    now: '2026-10-03T12:00:00.000Z',
    time: '01:59',
    timeZone: 'Australia/Lord_Howe',
  },
  {
    date: '2026-10-04',
    expected: '2026-10-03T15:30:00.000Z',
    now: '2026-10-03T12:00:00.000Z',
    time: '02:30',
    timeZone: 'Australia/Lord_Howe',
  },
])(
  'should save the valid $time wall-time boundary on $date in $timeZone',
  async ({date, expected, now, time, timeZone}) => {
    submitAlarm({date, now, time, timeZone})

    await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
    expect(mocks.memos[0]?.exactReminderAt).toBe(expected)
  },
)

it.each([
  {
    expected: '2026-11-01T05:30:00.000Z',
    season: 'summer',
    systemTime: '2026-07-01T12:00:00.000Z',
  },
  {
    expected: '2026-11-01T06:30:00.000Z',
    season: 'winter',
    systemTime: '2026-01-01T12:00:00.000Z',
  },
])(
  'should preserve Day.js fall-back resolution with a $season current-date seed',
  async ({expected, systemTime}) => {
    vi.useFakeTimers({toFake: ['Date']})
    vi.setSystemTime(new Date(systemTime))
    submitAlarm({
      date: '2026-11-01',
      now: '2026-11-01T04:00:00.000Z',
      time: '01:30',
      timeZone: 'America/New_York',
    })

    await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
    expect(mocks.memos[0]?.exactReminderAt).toBe(expected)
  },
)

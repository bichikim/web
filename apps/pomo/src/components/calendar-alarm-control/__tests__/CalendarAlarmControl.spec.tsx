/** @vitest-environment jsdom */
import type {CalendarEvent} from '../../../features/calendar'
import {
  CALENDAR_TIME_ZONE,
  event,
  mocks,
  now,
  ownedAlarm,
  setupCalendarAlarmControl,
} from './fixtures/setup'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

setupCalendarAlarmControl()

it('should preserve the all-day event date when no selected date is provided', () => {
  render(() => (
    <CalendarAlarmControl
      now={now}
      event={event}
      memos={() => mocks.memos}
      timeZone={CALENDAR_TIME_ZONE}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-05')
  expect(screen.getByLabelText('시간')).toHaveValue('09:00')
})

it.each([' 2026-09-05T00:00:00Z', '2026-09-05T00:00:00Z ', '\t2026-09-05T09:00:00+09:00\n'])(
  'should initialize a timed alarm from a start with surrounding whitespace: %j',
  (start) => {
    const source = {...event, allDay: false, end: '2026-09-05T01:00:00Z', start}
    render(() => (
      <CalendarAlarmControl
        now={now}
        event={source}
        memos={() => mocks.memos}
        timeZone="Asia/Seoul"
      />
    ))

    fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))

    expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-05')
    expect(screen.getByLabelText('시간')).toHaveValue('09:00')
  },
)

it('should preserve the all-day event calendar date for an ISO start', () => {
  const isoStartEvent: CalendarEvent = {
    ...event,
    start: '2026-09-06T00:00:00.000Z',
  }
  render(() => (
    <CalendarAlarmControl
      now={now}
      event={isoStartEvent}
      memos={() => mocks.memos}
      timeZone="America/Los_Angeles"
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-06')
  expect(screen.getByLabelText('시간')).toHaveValue('09:00')
})

it('should mark a consumed exact calendar alarm inactive', () => {
  mocks.memos = [{...ownedAlarm(), nextExactReminderAt: null}]
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)

  expect(screen.getByRole('button', {name: '팀 회의 알람 설정'})).toBeVisible()
  expect(screen.queryByRole('button', {name: '팀 회의 알람 수정'})).not.toBeInTheDocument()
})

it('should retain the stored alarm date instead of the selected day', () => {
  mocks.memos = [{...ownedAlarm(), exactReminderAt: new Date(2026, 8, 5, 8, 30).toISOString()}]
  render(() => (
    <CalendarAlarmControl
      now={now}
      defaultAlarmDate={new Date(2026, 8, 6)}
      event={event}
      memos={() => mocks.memos}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 수정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-05')
  expect(screen.getByLabelText('시간')).toHaveValue('08:30')
})

it('should retain a timed event start instead of the selected day', () => {
  render(() => (
    <CalendarAlarmControl
      now={now}
      defaultAlarmDate={new Date(2026, 8, 6)}
      event={{...event, allDay: false, start: new Date(2026, 8, 5, 13, 30).toISOString()}}
      memos={() => mocks.memos}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-05')
  expect(screen.getByLabelText('시간')).toHaveValue('13:30')
})

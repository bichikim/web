/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {type ComponentProps} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {CalendarAgenda} from '../Agenda'

vi.mock('../../calendar-alarm-control/CalendarAlarmControl', () => ({
  CalendarAlarmControl: (props: {readonly timeZone?: string}) => (
    <output aria-label="alarm time zone">{props.timeZone}</output>
  ),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const base: ComponentProps<typeof CalendarAgenda> = {
  calendar: {
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  },
  failed: false,
  loading: false,
  loginRequired: false,
  memos: {} as ComponentProps<typeof CalendarAgenda>['memos'],
  refreshFailed: false,
  selectedDate: new Date(2026, 8, 4),
  selectedEvents: [],
}
const event = {
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: 'work',
  end: '2026-09-06',
  id: 'connection:event',
  provider: 'google',
  start: '2026-09-05',
  title: 'Meeting',
} as const

it.each([
  [{loginRequired: true}, m.calendar_events_login_required()],
  [{loading: true}, m.calendar_loading()],
  [{failed: true}, m.calendar_events_failed()],
  [{}, m.calendar_day_empty()],
] as const)('should explain the current agenda state %j', (state, message) => {
  render(() => <CalendarAgenda {...base} {...state} />)
  expect(screen.getByText(message)).toBeVisible()
})

it('should pass the calendar time zone to event alarms', () => {
  render(() => <CalendarAgenda {...base} selectedEvents={[event]} />)
  expect(screen.getByLabelText('alarm time zone')).toHaveTextContent('Asia/Seoul')
})

/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {type ComponentProps, createSignal, ErrorBoundary} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getLocale, type Locale, overwriteGetLocale} from '@paraglide/runtime'
import {CalendarAgenda} from '../CalendarAgenda'
import {CalendarAlarmControl} from '../../calendar-alarm-control/CalendarAlarmControl'
import {type CalendarEvent, groupCalendarEvents} from '../../../features/calendar'

vi.mock('../../calendar-alarm-control/CalendarAlarmControl', () => ({
  CalendarAlarmControl: vi.fn(),
}))

const originalLocale = getLocale

beforeEach(() => {
  overwriteGetLocale(() => 'ko')
  vi.mocked(CalendarAlarmControl).mockImplementation((props) => (
    <output aria-label="alarm time zone">{props.timeZone}</output>
  ))
})

afterEach(() => {
  cleanup()
  overwriteGetLocale(originalLocale)
  vi.clearAllMocks()
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

const timedEvents = [0, 1, 2].map((hour) => ({
  ...event,
  allDay: false,
  end: `2026-09-05T0${hour + 1}:00:00Z`,
  id: `connection:event-${hour}`,
  start: `2026-09-05T0${hour}:00:00Z`,
  title: `Meeting ${hour}`,
}))

const observeFormatters = () => {
  const DateTimeFormat = Intl.DateTimeFormat
  return vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function observeFormatters(...args) {
    return new DateTimeFormat(...args)
  })
}

const timeCalls = (formatter: ReturnType<typeof observeFormatters>) =>
  formatter.mock.calls.filter(([, options]) => options?.hour === 'numeric')

it.each([
  [{loginRequired: true}, m.calendar_events_login_required],
  [{loading: true}, m.calendar_loading],
  [{failed: true}, m.calendar_events_failed],
  [{}, m.calendar_day_empty],
] as const)('should explain the current agenda state %j', (state, message) => {
  render(() => <CalendarAgenda {...base} {...state} />)
  expect(screen.getByText(message())).toBeVisible()
})

it('should pass the calendar time zone to event alarms', () => {
  render(() => <CalendarAgenda {...base} selectedEvents={[event]} />)
  expect(screen.getByLabelText('alarm time zone')).toHaveTextContent('Asia/Seoul')
})

it.each([' 2026-09-05T00:00:00Z', '2026-09-05T00:00:00Z ', '\t2026-09-05T09:00:00+09:00\n'])(
  'should display a grouped timed event with surrounding whitespace: %j',
  (start) => {
    const source = {...event, allDay: false, end: '2026-09-05T01:00:00Z', start}
    const selectedEvents = groupCalendarEvents([source], ['2026-09-05'], 'Asia/Seoul').get(
      '2026-09-05',
    )!

    render(() => <CalendarAgenda {...base} selectedEvents={selectedEvents} />)

    expect(screen.getByRole('listitem')).toHaveTextContent('Meeting')
    expect(screen.getByRole('listitem')).toHaveTextContent('9:00')
  },
)

it.each([
  {locale: 'ko', times: ['오전 9:00', '오전 10:00', '오전 11:00'], timeZone: 'Asia/Seoul'},
  {locale: 'en', times: ['12:00 AM', '1:00 AM', '2:00 AM'], timeZone: 'UTC'},
] as const)('should show ordered $locale times in $timeZone', ({locale, timeZone, times}) => {
  overwriteGetLocale(() => locale)
  render(() => (
    <CalendarAgenda
      {...base}
      calendar={{...base.calendar!, timeZone}}
      selectedEvents={timedEvents}
    />
  ))
  const list = screen.getByRole('list')
  expect(list).toHaveAttribute('tabindex', '0')
  const rows = within(list).getAllByRole('listitem')
  rows.forEach((row, index) => {
    expect(within(row).getByText(times[index])).toBeVisible()
    expect(within(row).getByText(`Meeting ${index}`)).toBeVisible()
  })
})

it.each([
  {loginRequired: true},
  {loading: true},
  {failed: true},
  {calendar: {...base.calendar!, connectedConnections: 0}},
  {selectedEvents: []},
  {selectedEvents: [event]},
])('should not create a time formatter for hidden or all-day rows: %j', (state) => {
  const formatter = observeFormatters()
  render(() => (
    <CalendarAgenda
      {...base}
      calendar={{...base.calendar!, timeZone: 'Invalid/Zone'}}
      selectedEvents={timedEvents}
      {...state}
    />
  ))
  expect(timeCalls(formatter)).toEqual([])
})

it('should share a time formatter across rows only within each agenda instance', () => {
  const formatter = observeFormatters()
  render(() => <CalendarAgenda {...base} selectedEvents={timedEvents} />)
  expect(timeCalls(formatter)).toEqual([
    ['ko', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul'}],
  ])
  render(() => <CalendarAgenda {...base} selectedEvents={timedEvents} />)
  expect(timeCalls(formatter)).toEqual([
    ['ko', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul'}],
    ['ko', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul'}],
  ])
})

it('should read a nonreactive locale on every row update and reuse each locale and zone pair', () => {
  let locale: Locale = 'ko'
  overwriteGetLocale(() => locale)
  const formatter = observeFormatters()
  const [events, setEvents] = createSignal(timedEvents)
  const [timeZone, setTimeZone] = createSignal('Asia/Seoul')
  render(() => (
    <CalendarAgenda
      {...base}
      calendar={{...base.calendar!, timeZone: timeZone()}}
      selectedEvents={events()}
    />
  ))
  const row = screen.getAllByRole('listitem')[0]
  expect(within(row).getByText('오전 9:00')).toBeVisible()
  locale = 'en'
  expect(within(row).getByText('오전 9:00')).toBeVisible()
  setEvents(events().map((item) => ({...item})))
  expect(within(row).getByText('9:00 AM')).toBeVisible()
  setTimeZone('UTC')
  expect(within(row).getByText('12:00 AM')).toBeVisible()
  locale = 'ko'
  setEvents(events().map((item) => ({...item})))
  expect(within(row).getByText('오전 12:00')).toBeVisible()
  setTimeZone('Asia/Seoul')
  expect(within(row).getByText('오전 9:00')).toBeVisible()
  expect(screen.getAllByRole('listitem')[0]).toBe(row)
  expect(timeCalls(formatter)).toEqual([
    ['ko', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul'}],
    ['en', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul'}],
    ['en', {hour: 'numeric', minute: '2-digit', timeZone: 'UTC'}],
    ['ko', {hour: 'numeric', minute: '2-digit', timeZone: 'UTC'}],
  ])
})

it('should track reactive locale changes even when returning to a cached formatter', () => {
  const [locale, setLocale] = createSignal<Locale>('ko')
  overwriteGetLocale(locale)
  render(() => <CalendarAgenda {...base} selectedEvents={timedEvents} />)
  const row = screen.getAllByRole('listitem')[0]
  setLocale('en')
  expect(within(row).getByText('9:00 AM')).toBeVisible()
  setLocale('ko')
  expect(within(row).getByText('오전 9:00')).toBeVisible()
  expect(screen.getAllByRole('listitem')[0]).toBe(row)
})

it('should stay lazy through hidden and all-day transitions', () => {
  const formatter = observeFormatters()
  const [loading, setLoading] = createSignal(true)
  const [events, setEvents] = createSignal<ReadonlyArray<CalendarEvent>>([event])
  const [timeZone, setTimeZone] = createSignal('Invalid/Zone')
  render(() => (
    <CalendarAgenda
      {...base}
      calendar={{...base.calendar!, timeZone: timeZone()}}
      loading={loading()}
      selectedEvents={events()}
    />
  ))
  setLoading(false)
  expect(screen.getByText('종일')).toBeVisible()
  expect(timeCalls(formatter)).toEqual([])
  setTimeZone('Asia/Seoul')
  setEvents(timedEvents)
  expect(screen.getByText('오전 9:00')).toBeVisible()
  setLoading(true)
  setTimeZone('UTC')
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  setLoading(false)
  expect(screen.getByText('오전 12:00')).toBeVisible()
  setEvents([event])
  setEvents(timedEvents)
  expect(timeCalls(formatter)).toEqual([
    ['ko', {hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul'}],
    ['ko', {hour: 'numeric', minute: '2-digit', timeZone: 'UTC'}],
  ])
})

it.each([
  {message: /Invalid time zone|Invalid timeZone/, timeZone: 'Invalid/Zone'},
  {message: /Invalid time value/, timeZone: 'UTC'},
])('should retain native formatting errors for $timeZone', ({message, timeZone}) => {
  render(() => (
    <ErrorBoundary fallback={(error: Error) => <p role="alert">{error.message}</p>}>
      <CalendarAgenda
        {...base}
        calendar={{...base.calendar!, timeZone}}
        selectedEvents={[{...timedEvents[0], start: 'invalid'}]}
      />
    </ErrorBoundary>
  ))
  expect(screen.getByRole('alert')).toHaveTextContent(message)
})

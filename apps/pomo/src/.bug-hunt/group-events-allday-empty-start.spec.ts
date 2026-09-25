/** @vitest-environment node */
import {expect, it} from 'vitest'

import {groupCalendarEvents, type CalendarEvent} from '../features/calendar'

const base: CalendarEvent = {
  accountLabel: 'test@example.com',
  allDay: true,
  calendarLabel: 'test',
  end: '2026-09-05',
  id: 'empty-start',
  provider: 'google',
  start: '',
  title: 'Empty all-day start',
}

it('should omit all-day events with an empty start date', () => {
  const grouped = groupCalendarEvents(
    [base],
    ['2026-09-03', '2026-09-04', '2026-09-05'],
    'UTC',
  )

  expect([...grouped.keys()]).toEqual([])
})

it('should omit all-day events when start is only whitespace', () => {
  const event: CalendarEvent = {
    ...base,
    id: 'whitespace-start',
    start: '   ',
    title: 'Whitespace start',
  }

  expect(groupCalendarEvents([event], ['2026-09-03', '2026-09-04'], 'UTC').size).toBe(0)
})

it('should omit all-day events with an invalid civil start date', () => {
  const event: CalendarEvent = {
    ...base,
    id: 'invalid-civil-start',
    start: '2026-02-30',
    title: 'Invalid civil start',
  }

  expect(groupCalendarEvents([event], ['2026-09-03', '2026-09-04'], 'UTC').size).toBe(0)
})

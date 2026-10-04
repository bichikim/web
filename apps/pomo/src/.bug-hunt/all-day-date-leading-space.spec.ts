/** @vitest-environment node */
import {expect, it} from 'vitest'

import {
  createCalendarPromptContext,
  groupCalendarEvents,
  parseAllDayDateKey,
} from '../features/calendar'
import type {CalendarEvent} from '../features/calendar/types'

const createAllDayEvent = (start: string, end: string): CalendarEvent => ({
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: 'Calendar',
  end,
  id: 'leading-space',
  provider: 'google',
  start,
  title: 'Whitespace boundary event',
})

it('should keep an all-day event when the start date has trailing whitespace', () => {
  const event = createAllDayEvent('2026-09-05', '2026-09-06 ')

  expect(parseAllDayDateKey(event.start)).toBe('2026-09-05')
  expect(groupCalendarEvents([event], ['2026-09-05'], 'UTC').get('2026-09-05')).toEqual([event])
})

it('should keep an all-day event when the start date has leading whitespace', () => {
  const event = createAllDayEvent(' 2026-09-05', '2026-09-06')

  expect(parseAllDayDateKey(event.start)).toBe('2026-09-05')
  expect(groupCalendarEvents([event], ['2026-09-05'], 'UTC').get('2026-09-05')).toEqual([event])
  expect(createCalendarPromptContext({events: [event], timeZone: 'UTC'})).toContain(
    'Whitespace boundary event',
  )
})

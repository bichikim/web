/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseAllDayDate, parseAllDayDateKey} from '../features/calendar/all-day-date'
import {groupCalendarEvents} from '../features/calendar/group-events'
import {createCalendarPromptContext} from '../features/calendar/prompt'
import type {CalendarEvent} from '../features/calendar/types'

const createAllDayEvent = (start: string, end: string): CalendarEvent => ({
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: 'Calendar',
  end,
  id: 'all-day-range-mismatch',
  provider: 'google',
  start,
  title: '범위 밖 종일 일정',
})

it('should keep all-day grouping and chat grounding aligned inside civil-date range', () => {
  const start = '0099-12-31'
  const event = createAllDayEvent(start, '0100-01-01')

  expect(parseAllDayDateKey(start)).toBe('0099-12-31')
  expect(parseAllDayDate(start)).toBeNull()

  const grouped = groupCalendarEvents([event], ['0099-12-31'], 'UTC')
  expect(grouped.get('0099-12-31')?.map((entry) => entry.id)).toEqual([event.id])

  const prompt = createCalendarPromptContext({events: [event], timeZone: 'UTC'})
  expect(prompt).toContain(event.title)
})

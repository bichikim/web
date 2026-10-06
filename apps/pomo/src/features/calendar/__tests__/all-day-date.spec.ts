/** @vitest-environment node */
import {expect, it} from 'vitest'

import {
  createCalendarPromptContext,
  groupCalendarEvents,
  parseAllDayDate,
  parseAllDayDateKey,
} from '../index'
import type {CalendarEvent} from '../types'

const createAllDayEvent = (start: string, end: string): CalendarEvent => ({
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: 'Calendar',
  end,
  id: 'all-day-date-boundary',
  provider: 'google',
  start,
  title: 'Boundary event',
})

it.each([
  {
    description: 'minimum supported date',
    end: '0100-01-02',
    start: '0100-01-01',
    visibleDate: '0100-01-01',
  },
  {
    description: 'maximum supported end date',
    end: '9999-12-31',
    start: '9999-12-30',
    visibleDate: '9999-12-30',
  },
])('should keep the $description in grouping and prompt context', ({end, start, visibleDate}) => {
  const event = createAllDayEvent(start, end)

  expect(parseAllDayDateKey(start)).toBe(start)
  expect(parseAllDayDate(start)).toEqual({
    day: Number(start.slice(8, 10)),
    month: Number(start.slice(5, 7)),
    year: Number(start.slice(0, 4)),
  })
  expect(groupCalendarEvents([event], [visibleDate], 'UTC').get(visibleDate)).toEqual([event])

  const context = createCalendarPromptContext({events: [event], timeZone: 'UTC'})
  expect(context).toContain('Boundary event')
  expect(context).not.toContain('일부 일정만 확인했습니다.')
})

it.each([
  {
    description: 'a date below MINIMUM_YEAR',
    end: '0100-01-01',
    start: '0099-12-31',
    visibleDate: '0099-12-31',
  },
  {
    description: 'an event starting below MINIMUM_YEAR and spanning into the supported range',
    end: '0100-01-02',
    start: '0099-12-31',
    visibleDate: '0100-01-01',
  },
  {
    description: 'an invalid calendar date',
    end: '0100-03-01',
    start: '0100-02-29',
    visibleDate: '0100-02-29',
  },
])('should consistently reject $description from all-day flows', ({end, start, visibleDate}) => {
  const event = createAllDayEvent(start, end)
  const grouped = groupCalendarEvents([event], [visibleDate], 'UTC')
  const context = createCalendarPromptContext({events: [event], timeZone: 'UTC'})

  expect({
    groupedEventIds: grouped.get(visibleDate)?.map(({id}) => id) ?? [],
    promptContainsEvent: context.includes(event.title),
  }).toEqual({groupedEventIds: [], promptContainsEvent: false})
  expect(parseAllDayDateKey(start)).toBeNull()
  expect(parseAllDayDate(start)).toBeNull()
  expect(grouped.has(visibleDate)).toBe(false)

  expect(context).toContain('일부 일정만 확인했습니다.')
  expect(context).toContain('확인된 일정이 없습니다.')
  expect(context).not.toContain(event.title)
})

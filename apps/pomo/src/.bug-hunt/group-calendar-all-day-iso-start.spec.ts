/** @vitest-environment node */
import {expect, it} from 'vitest'

import {type CalendarEvent, groupCalendarEvents} from '../features/calendar'

const base: CalendarEvent = {
  accountLabel: 'test@example.com',
  allDay: true,
  calendarLabel: 'test',
  end: '2026-10-01',
  id: 'all-day-iso-start',
  provider: 'google',
  start: '2026-09-30T00:00:00Z',
  title: '종일 일정',
}

it('should group all-day events whose start is an ISO instant instead of a date key', () => {
  const grouped = groupCalendarEvents([base], ['2026-09-30', '2026-10-01'], 'Asia/Seoul')

  expect(grouped.get('2026-09-30')).toEqual([base])
})

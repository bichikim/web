/** @vitest-environment node */
import {expect, it} from 'vitest'

import {type CalendarEvent, groupCalendarEvents} from '../features/calendar/group-events'

it('should not place an all-day event on its exclusive ISO end date', () => {
  const event: CalendarEvent = {
    accountLabel: 'test@example.com',
    allDay: true,
    calendarLabel: 'test',
    end: '2026-09-03T00:00:00.000Z',
    id: 'all-day-iso-end',
    provider: 'google',
    start: '2026-09-01',
    title: 'All-day',
  }

  const grouped = groupCalendarEvents(
    [event],
    ['2026-09-01', '2026-09-02', '2026-09-03'],
    'UTC',
  )

  expect([...grouped.keys()]).toEqual(['2026-09-01', '2026-09-02'])
})

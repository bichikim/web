/** @vitest-environment node */
import {expect, it} from 'vitest'

import {groupCalendarEvents, type CalendarEvent} from '../features/calendar'

const zeroDurationTimedEvent: CalendarEvent = {
  accountLabel: 'work@example.com',
  allDay: false,
  calendarLabel: '업무',
  end: '2026-09-05T01:00:00.000Z',
  id: 'event-1',
  provider: 'google',
  start: '2026-09-05T01:00:00.000Z',
  title: '제로 길이 회의',
}

it('should omit zero-duration timed events from the month grid grouping', () => {
  const grouped = groupCalendarEvents([zeroDurationTimedEvent], ['2026-09-05'], 'Asia/Seoul')

  expect(grouped.size).toBe(0)
})

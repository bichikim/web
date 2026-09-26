/** @vitest-environment node */
import {expect, it} from 'vitest'

import {groupCalendarEvents} from '../features/calendar/group-events'
import type {CalendarEvent} from '../features/calendar/types'

const invertedTimedEvent: CalendarEvent = {
  accountLabel: 'work@example.com',
  allDay: false,
  calendarLabel: '업무',
  end: '2026-09-05T01:00:00.000Z',
  id: 'inverted-timed',
  provider: 'google',
  start: '2026-09-05T02:00:00.000Z',
  title: '종료가 시작보다 이른 일정',
}

it('should not place timed events whose end is not after start on the calendar grid', () => {
  const grouped = groupCalendarEvents(
    [invertedTimedEvent],
    ['2026-09-04', '2026-09-05', '2026-09-06'],
    'Asia/Seoul',
  )

  expect(grouped.size).toBe(0)
})

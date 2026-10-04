/** @vitest-environment node */
import {expect, it} from 'vitest'

import {type CalendarEvent, groupCalendarEvents} from 'src/features/calendar'

const baseTimedEvent: CalendarEvent = {
  accountLabel: 'test@example.com',
  allDay: false,
  calendarLabel: 'test',
  end: '2026-09-04T02:00:00Z',
  id: 'leading-ws',
  provider: 'google',
  start: '2026-09-03T14:00:00Z',
  title: 'Leading whitespace start',
}

it('should group timed events when the ISO start has leading whitespace', () => {
  const source = {...baseTimedEvent, start: ` ${baseTimedEvent.start}`}
  const grouped = groupCalendarEvents([source], ['2026-09-03', '2026-09-04'], 'Asia/Seoul')

  expect(grouped.get('2026-09-03')).toEqual([source])
})

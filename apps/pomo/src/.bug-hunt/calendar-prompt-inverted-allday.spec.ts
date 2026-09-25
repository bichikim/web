/** @vitest-environment node */
import {expect, it} from 'vitest'

import {
  createCalendarPromptContext,
  groupCalendarEvents,
  type CalendarEvent,
} from '../features/calendar'

const invertedAllDay: CalendarEvent = {
  accountLabel: 'work@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-09-05',
  id: 'inverted',
  provider: 'google',
  start: '2026-09-07',
  title: '역전된 종일',
}

it('should omit inverted all-day events from chat context like the month grid', () => {
  expect(
    groupCalendarEvents([invertedAllDay], ['2026-09-05', '2026-09-06', '2026-09-07'], 'Asia/Seoul')
      .size,
  ).toBe(0)

  const context = createCalendarPromptContext({
    events: [invertedAllDay],
    timeZone: 'Asia/Seoul',
  })

  expect(context).not.toContain('역전된 종일')
  expect(context).toContain('조회 기간에 등록된 일정이 없습니다.')
})

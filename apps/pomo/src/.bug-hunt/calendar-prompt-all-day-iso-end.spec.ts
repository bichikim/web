/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'
import type {CalendarEvent} from '../features/calendar/types'

const allDayEvent: CalendarEvent = {
  accountLabel: 'work@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-09-06T00:00:00.000Z',
  id: 'event-all-day-iso-end',
  provider: 'google',
  start: '2026-09-05',
  title: '종일 일정',
}

it('should include all-day events when the exclusive end is an ISO midnight instant', () => {
  const context = createCalendarPromptContext({
    events: [allDayEvent],
    timeZone: 'Asia/Seoul',
  })

  expect(context).not.toContain('일부 일정만 확인했습니다.')
  expect(context).toContain('종일 일정')
})

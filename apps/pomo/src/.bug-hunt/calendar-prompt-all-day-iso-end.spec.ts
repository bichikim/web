/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'
import type {CalendarEvent} from '../features/calendar/types'

const event: CalendarEvent = {
  accountLabel: 'work@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-10-01T00:00:00.000Z',
  id: 'all-day-iso-end',
  provider: 'google',
  start: '2026-09-30',
  title: 'ISO 종료 종일 일정',
}

it('should include all-day events whose exclusive end is an ISO instant', () => {
  const context = createCalendarPromptContext({
    events: [event],
    timeZone: 'UTC',
  })

  expect(context).toContain('ISO 종료 종일 일정')
  expect(context).not.toContain('일부 일정만 확인했습니다.')
})

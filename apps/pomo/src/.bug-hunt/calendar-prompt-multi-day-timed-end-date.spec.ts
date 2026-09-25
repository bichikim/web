/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'
import type {CalendarEvent} from '../features/calendar/types'

it('should include the end calendar date when a timed event crosses midnight in the display zone', () => {
  const event: CalendarEvent = {
    accountLabel: 'work@example.com',
    allDay: false,
    calendarLabel: '업무',
    end: '2026-09-06T05:00:00.000Z',
    id: 'overnight-meeting',
    provider: 'google',
    start: '2026-09-05T14:00:00.000Z',
    title: '야간 회의',
  }

  const context = createCalendarPromptContext({events: [event], timeZone: 'Asia/Seoul'})

  expect(context).toContain('2026. 9. 6.')
})

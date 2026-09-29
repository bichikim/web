/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'
import type {CalendarEvent} from '../features/calendar/types'

const reversedTimed: CalendarEvent = {
  accountLabel: 'work@example.com',
  allDay: false,
  calendarLabel: '업무',
  end: '2026-09-05T00:00:00.000Z',
  id: 'reversed',
  provider: 'google',
  start: '2026-09-05T01:00:00.000Z',
  title: '종료가 더 빠른 일정',
}

it('should omit timed events whose end is before the start', () => {
  const context = createCalendarPromptContext({
    events: [reversedTimed],
    timeZone: 'UTC',
  })

  expect(context).not.toContain('종료가 더 빠른 일정')
  expect(context).toContain('일부 일정만 확인했습니다.')
})

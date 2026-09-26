/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'
import type {CalendarEvent} from '../features/calendar/types'

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

it('should omit zero-duration timed events from chat calendar grounding', () => {
  const context = createCalendarPromptContext({
    events: [zeroDurationTimedEvent],
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('일부 일정만 확인했습니다.')
  expect(context).not.toContain('제로 길이 회의')
})

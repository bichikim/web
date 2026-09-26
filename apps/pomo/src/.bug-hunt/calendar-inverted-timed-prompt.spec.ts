/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'
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

it('should omit timed events whose end is not after start from chat grounding', () => {
  const context = createCalendarPromptContext({
    events: [invertedTimedEvent],
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('일부 일정만 확인했습니다.')
  expect(context).toContain('확인된 일정이 없습니다.')
  expect(context).not.toContain('종료가 시작보다 이른 일정')
})

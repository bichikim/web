/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'
import type {CalendarEvent} from '../features/calendar/types'

const allDayIsoStart: CalendarEvent = {
  accountLabel: 'work@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-10-01',
  id: 'all-day-iso-start',
  provider: 'google',
  start: '2026-09-30T00:00:00Z',
  title: 'ISO 시작 종일 일정',
}

it('should include all-day events whose start is an ISO instant with a date prefix', () => {
  const context = createCalendarPromptContext({
    events: [allDayIsoStart],
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('ISO 시작 종일 일정')
  expect(context).not.toContain('일부 일정만 확인했습니다.')
})

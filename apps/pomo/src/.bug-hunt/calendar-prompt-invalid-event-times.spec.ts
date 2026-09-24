/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'

it('should not emit Invalid Date for timed events whose start/end are unparsable', () => {
  const context = createCalendarPromptContext({
    events: [
      {
        accountLabel: 'work@example.com',
        allDay: false,
        calendarLabel: '업무',
        end: 'not-an-iso-datetime',
        id: 'bad-event',
        provider: 'google',
        start: 'also-not-an-iso-datetime',
        title: '깨진 일정',
      },
    ],
    timeZone: 'Asia/Seoul',
  })

  expect(context).not.toContain('Invalid Date')
})

it('should not print impossible civil dates for all-day events with invalid start strings', () => {
  const context = createCalendarPromptContext({
    events: [
      {
        accountLabel: 'work@example.com',
        allDay: true,
        calendarLabel: '업무',
        end: '2026-09-06',
        id: 'bad-allday',
        provider: 'google',
        start: '2026-13-45',
        title: '잘못된 종일',
      },
    ],
    timeZone: 'Asia/Seoul',
  })

  expect(context).not.toMatch(/2026\. 13\. 45/)
})

/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../features/calendar/prompt'

it('should include the exclusive all-day end date when an event spans multiple days', () => {
  const context = createCalendarPromptContext({
    events: [
      {
        accountLabel: 'work@example.com',
        allDay: true,
        calendarLabel: '업무',
        end: '2026-09-07',
        id: 'vacation',
        provider: 'google',
        start: '2026-09-05',
        title: '휴가',
      },
    ],
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('2026. 9. 7.')
})

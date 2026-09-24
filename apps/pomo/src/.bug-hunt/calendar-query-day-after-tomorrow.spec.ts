/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

it('should query the day after tomorrow when the user says 모레', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  expect(
    createCalendarQuery({now, text: '모레 일정 알려줘', timeZone: 'Asia/Seoul'}),
  ).toEqual({
    end: '2026-09-06T15:00:00.000Z',
    start: '2026-09-05T15:00:00.000Z',
  })
})

/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

it('should include today when the user asks about both today and tomorrow', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  expect(
    createCalendarQuery({now, text: '오늘 내일 일정 알려줘', timeZone: 'Asia/Seoul'}),
  ).toEqual({
    end: '2026-09-05T15:00:00.000Z',
    start: '2026-09-04T10:30:00.000Z',
  })
})

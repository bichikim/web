/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

it('should query only tomorrow afternoon when the user asks for 내일 오후', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  expect(createCalendarQuery({now, text: '내일 오후 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
    end: '2026-09-05T15:00:00.000Z',
    start: '2026-09-05T03:00:00.000Z',
  })
})

it('should query only the remaining afternoon when the user asks for 오늘 오후', () => {
  const now = new Date('2026-09-04T23:00:00.000Z')

  expect(createCalendarQuery({now, text: '오늘 오후 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
    end: '2026-09-05T15:00:00.000Z',
    start: '2026-09-05T03:00:00.000Z',
  })
})

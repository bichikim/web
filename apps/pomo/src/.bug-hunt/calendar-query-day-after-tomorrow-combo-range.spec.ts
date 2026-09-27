/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it('should include tomorrow when the query also mentions the day after tomorrow', () => {
  expect(createCalendarQuery({now, text: '내일 모레 일정 알려줘', timeZone})).toEqual({
    end: '2026-09-06T15:00:00.000Z',
    start: '2026-09-04T15:00:00.000Z',
  })
})

it('should include today when the query also mentions the day after tomorrow', () => {
  expect(createCalendarQuery({now, text: '오늘 모레 일정 알려줘', timeZone})).toEqual({
    end: '2026-09-06T15:00:00.000Z',
    start: '2026-09-04T10:30:00.000Z',
  })
})

/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

it('should include yesterday and today when both relative days appear in the query', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  expect(createCalendarQuery({now, text: '어제 오늘 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
    end: '2026-09-04T15:00:00.000Z',
    start: '2026-09-02T15:00:00.000Z',
  })
})

it('should include yesterday and today for an implicit schedule question spanning both days', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  expect(createCalendarQuery({now, text: '어제 오늘 뭐 있었어?', timeZone: 'Asia/Seoul'})).toEqual({
    end: '2026-09-04T15:00:00.000Z',
    start: '2026-09-02T15:00:00.000Z',
  })
})

it('should include yesterday through tomorrow when all three relative days appear in the query', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  expect(createCalendarQuery({now, text: '어제 오늘 내일 일정', timeZone: 'Asia/Seoul'})).toEqual({
    end: '2026-09-05T15:00:00.000Z',
    start: '2026-09-02T15:00:00.000Z',
  })
})

import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar query today + next week (bug hunt)', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should span from now through the end of next week when both are requested', () => {
    const nextWeekOnly = createCalendarQuery({
      now,
      text: '다음 주 일정 알려줘',
      timeZone,
    })

    expect(createCalendarQuery({now, text: '오늘 다음 주 일정 알려줘', timeZone})).toEqual({
      end: nextWeekOnly?.end,
      start: now.toISOString(),
    })
  })
})

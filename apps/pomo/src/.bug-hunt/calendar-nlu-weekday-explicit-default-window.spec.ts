import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for a standalone weekday', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should query the next local Wednesday instead of the 30-day default window', () => {
    expect(createCalendarQuery({now, text: '수요일 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-09T15:00:00.000Z',
      start: '2026-09-08T15:00:00.000Z',
    })
  })
})

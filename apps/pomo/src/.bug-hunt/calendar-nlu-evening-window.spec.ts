import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU evening window', () => {
  const now = new Date('2026-09-04T01:00:00.000Z') // 10:00 KST, before typical evening
  const expected = {
    end: '2026-09-04T15:00:00.000Z',
    start: '2026-09-04T09:00:00.000Z',
  }

  it('should narrow today to the evening for an explicit schedule request', () => {
    expect(
      createCalendarQuery({now, text: '오늘 저녁 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual(expected)
  })

  it('should narrow today to the evening for an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '오늘 저녁 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual(
      expected,
    )
  })
})

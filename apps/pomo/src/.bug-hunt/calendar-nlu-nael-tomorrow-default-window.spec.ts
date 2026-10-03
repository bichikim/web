import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for spoken 낼 (내일)', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const expected = {end: '2026-09-05T15:00:00.000Z', start: '2026-09-04T15:00:00.000Z'}

  it('should query tomorrow for an explicit schedule query', () => {
    expect(createCalendarQuery({now, text: '낼 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual(
      expected,
    )
  })

  it('should query tomorrow for an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '낼 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual(expected)
  })
})

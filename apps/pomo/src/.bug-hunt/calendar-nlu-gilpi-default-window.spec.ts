import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 글피', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const expected = {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'}

  it('should query the exact local day for an explicit schedule query', () => {
    expect(createCalendarQuery({now, text: '글피 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual(
      expected,
    )
  })

  it('should query the exact local day for an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '글피 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual(
      expected,
    )
  })
})

/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 지난주', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const expected = {end: '2026-09-06T15:00:00.000Z', start: '2026-08-30T15:00:00.000Z'}

  it('should query the previous local week for an explicit schedule query', () => {
    expect(createCalendarQuery({now, text: '지난주 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual(
      expected,
    )
  })
})

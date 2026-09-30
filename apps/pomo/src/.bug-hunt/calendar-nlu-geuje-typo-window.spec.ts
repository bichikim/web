/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 그제 (common synonym of 그저께)', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const expected = {end: '2026-09-02T15:00:00.000Z', start: '2026-09-01T15:00:00.000Z'}

  it('should query the exact local day for an explicit schedule query', () => {
    expect(createCalendarQuery({now, text: '그제 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual(
      expected,
    )
  })
})

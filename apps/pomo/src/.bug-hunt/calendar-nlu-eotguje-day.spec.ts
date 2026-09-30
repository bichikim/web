/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 엊그제', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'
  const expected = {end: '2026-09-02T15:00:00.000Z', start: '2026-09-01T15:00:00.000Z'}

  it('should query the exact local day for an explicit schedule query', () => {
    expect(createCalendarQuery({now, text: '엊그제 일정 알려줘', timeZone})).toEqual(expected)
  })

  it('should query the exact local day for an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '엊그제 뭐 있었어?', timeZone})).toEqual(expected)
  })
})

/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU weekday within next week', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  const daySpanMs = (range: {end: string; start: string}) =>
    Date.parse(range.end) - Date.parse(range.start)

  it('should resolve 다음 주 수요일 to a single local day instead of the whole next week', () => {
    const wednesday = createCalendarQuery({now, text: '다음 주 수요일 일정 알려줘', timeZone})
    const nextWeek = createCalendarQuery({now, text: '다음 주 일정 알려줘', timeZone})
    const singleDay = createCalendarQuery({now, text: '모레 일정 알려줘', timeZone})

    expect(wednesday).not.toEqual(nextWeek)
    expect(wednesday).not.toBeNull()
    expect(singleDay).not.toBeNull()
    expect(daySpanMs(wednesday!)).toBe(daySpanMs(singleDay!))
  })

  it('should treat implicit 다음 주 수요일 schedule questions like the explicit query', () => {
    const explicit = createCalendarQuery({now, text: '다음 주 수요일 일정 알려줘', timeZone})
    const implicit = createCalendarQuery({now, text: '다음 주 수요일 뭐 있어?', timeZone})

    expect(implicit).not.toBeNull()
    expect(implicit).toEqual(explicit)
  })
})

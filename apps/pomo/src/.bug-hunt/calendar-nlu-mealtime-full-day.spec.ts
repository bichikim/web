/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU mealtime markers', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it.each(['점심', '저녁', '새벽'])(
    'should narrow 내일 %s schedule queries instead of returning the full local day',
    (marker) => {
      const narrowed = createCalendarQuery({now, text: `내일 ${marker} 일정 알려줘`, timeZone})
      const fullDay = createCalendarQuery({now, text: '내일 일정 알려줘', timeZone})

      expect(narrowed).not.toEqual(fullDay)
    },
  )

  it('should narrow implicit 내일 점심 schedule questions', () => {
    const implicit = createCalendarQuery({now, text: '내일 점심 뭐 있어?', timeZone})
    const fullDay = createCalendarQuery({now, text: '내일 뭐 있어?', timeZone})

    expect(implicit).not.toEqual(fullDay)
  })
})

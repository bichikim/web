/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('createCalendarQuery this week with next week', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should span through next week when both week phrases appear', () => {
    expect(createCalendarQuery({now, text: '이번 주 다음 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should span through next week regardless of phrase order', () => {
    expect(createCalendarQuery({now, text: '다음 주 이번 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

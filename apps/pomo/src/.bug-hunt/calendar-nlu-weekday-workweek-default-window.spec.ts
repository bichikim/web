/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 평일·주중', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'
  const defaultWindowEnd = new Date(now.getTime() + 30 * 86_400_000).toISOString()

  it('should not fall back to the 30-day default window for an explicit weekday schedule query', () => {
    const result = createCalendarQuery({now, text: '평일 일정 알려줘', timeZone})

    expect(result).not.toBeNull()
    expect(result?.end).not.toBe(defaultWindowEnd)
    expect(result).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should treat 주중 the same as 평일', () => {
    const result = createCalendarQuery({now, text: '주중 일정 알려줘', timeZone})

    expect(result).not.toBeNull()
    expect(result?.end).not.toBe(defaultWindowEnd)
    expect(result).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

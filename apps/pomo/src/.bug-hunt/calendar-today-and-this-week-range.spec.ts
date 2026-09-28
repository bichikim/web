/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('createCalendarQuery today plus this week', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  it('should query through this Sunday when today and this week are requested together', () => {
    expect(
      createCalendarQuery({now, text: '오늘 이번 주 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 이번 주 + weekday', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should query only the named weekday instead of the rest of the week', () => {
    expect(
      createCalendarQuery({now, text: '이번 주 금요일 일정 알려줘', timeZone}),
    ).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

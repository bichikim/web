/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 다다음 주', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const nextWeek = {
    end: '2026-09-13T15:00:00.000Z',
    start: '2026-09-06T15:00:00.000Z',
  }
  const weekAfterNext = {
    end: '2026-09-20T15:00:00.000Z',
    start: '2026-09-13T15:00:00.000Z',
  }

  it.each(['다다음 주 일정 알려줘', '다다음주 일정 알려줘'])(
    'should query the week after next, not the immediately following week, for "%s"',
    (text) => {
      const actual = createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})
      expect(actual).not.toEqual(nextWeek)
      expect(actual).toEqual(weekAfterNext)
    },
  )
})

/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 다다음 (week/month/weekend)', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  const nextWeek = {
    end: '2026-09-13T15:00:00.000Z',
    start: '2026-09-06T15:00:00.000Z',
  }
  const weekAfterNext = {
    end: '2026-09-20T15:00:00.000Z',
    start: '2026-09-13T15:00:00.000Z',
  }
  const nextMonth = {
    end: '2026-10-31T15:00:00.000Z',
    start: '2026-09-30T15:00:00.000Z',
  }
  const monthAfterNext = {
    end: '2026-11-30T15:00:00.000Z',
    start: '2026-10-31T15:00:00.000Z',
  }
  const nextWeekend = {
    end: '2026-09-13T15:00:00.000Z',
    start: '2026-09-11T15:00:00.000Z',
  }
  const weekendAfterNext = {
    end: '2026-09-20T15:00:00.000Z',
    start: '2026-09-18T15:00:00.000Z',
  }

  it.each(['다다음 주 일정 알려줘', '다다음주 일정 알려줘'])(
    'should query the week after next for "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone})).toEqual(weekAfterNext)
      expect(createCalendarQuery({now, text, timeZone})).not.toEqual(nextWeek)
    },
  )

  it.each(['다다음 달 일정 알려줘', '다다음달 일정 알려줘'])(
    'should query the month after next for "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone})).toEqual(monthAfterNext)
      expect(createCalendarQuery({now, text, timeZone})).not.toEqual(nextMonth)
    },
  )

  it('should query the weekend after next for 다다음 주말', () => {
    const text = '다다음 주말 일정 알려줘'
    expect(createCalendarQuery({now, text, timeZone})).toEqual(weekendAfterNext)
    expect(createCalendarQuery({now, text, timeZone})).not.toEqual(nextWeekend)
  })

  it('should treat 다다음 주 like an offset beyond 다음 주', () => {
    const followingWeek = createCalendarQuery({now, text: '다다음 주 일정 알려줘', timeZone})
    const nextWeekQuery = createCalendarQuery({now, text: '다음 주 일정 알려줘', timeZone})

    expect(nextWeekQuery).toEqual(nextWeek)
    expect(followingWeek).not.toEqual(nextWeekQuery)
    expect(followingWeek).toEqual(weekAfterNext)
  })
})

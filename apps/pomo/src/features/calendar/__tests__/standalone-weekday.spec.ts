import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery for a standalone explicit weekday', () => {
  const timeZone = 'Asia/Seoul'
  const now = new Date('2026-09-04T10:30:00.000Z')

  it('should query the next local occurrence of the requested weekday', () => {
    expect(createCalendarQuery({now, text: '수요일 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-09T15:00:00.000Z',
      start: '2026-09-08T15:00:00.000Z',
    })
  })

  it('should query the remaining local day when the requested weekday is today', () => {
    const weekdayQuery = createCalendarQuery({now, text: '금요일 일정 알려줘', timeZone})
    const todayQuery = createCalendarQuery({now, text: '오늘 일정 알려줘', timeZone})

    expect(weekdayQuery).toEqual(todayQuery)
    expect(weekdayQuery).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should use local midnight when the requested same-day morning has passed', () => {
    const query = createCalendarQuery({now, text: '금요일 오전 일정 알려줘', timeZone})

    expect(query).toEqual({
      end: '2026-09-04T03:00:00.000Z',
      start: '2026-09-03T15:00:00.000Z',
    })
    expect(Date.parse(query?.start ?? '')).toBeLessThan(Date.parse(query?.end ?? ''))
  })

  it.each([
    {
      end: '2026-09-04T15:00:00.000Z',
      now: '2026-09-04T02:00:00.000Z',
      start: '2026-09-04T03:00:00.000Z',
      when: 'before noon',
    },
    {
      end: '2026-09-04T15:00:00.000Z',
      now: '2026-09-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
      when: 'after noon',
    },
  ])('should query the remaining afternoon for today $when', ({end, now, start}) => {
    expect(
      createCalendarQuery({now: new Date(now), text: '금요일 오후 일정 알려줘', timeZone}),
    ).toEqual({end, start})
  })
})

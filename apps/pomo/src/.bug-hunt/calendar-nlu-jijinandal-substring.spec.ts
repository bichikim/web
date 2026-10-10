/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 지지난달', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'
  const twoMonthsAgo = {
    end: '2026-07-31T15:00:00.000Z',
    start: '2026-06-30T15:00:00.000Z',
  }
  const lastMonth = {
    end: '2026-08-31T15:00:00.000Z',
    start: '2026-07-31T15:00:00.000Z',
  }

  it('should query two local months ago like 지지난주 mirrors two weeks ago', () => {
    expect(createCalendarQuery({now, text: '지지난주 일정 알려줘', timeZone})).toEqual({
      end: '2026-08-23T15:00:00.000Z',
      start: '2026-08-16T15:00:00.000Z',
    })
  })

  it.each(['지지난달 일정 알려줘', '지지난 달 일정 알려줘'])(
    'should not treat "%s" as 지난 달 only',
    (text) => {
      const result = createCalendarQuery({now, text, timeZone})
      expect(result).toEqual(twoMonthsAgo)
      expect(result).not.toEqual(lastMonth)
    },
  )

  it('should still query last month for an explicit 지난 달 request', () => {
    expect(createCalendarQuery({now, text: '지난 달 일정 알려줘', timeZone})).toEqual(lastMonth)
  })
})

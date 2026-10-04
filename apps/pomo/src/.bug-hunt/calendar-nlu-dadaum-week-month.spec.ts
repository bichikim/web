import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 다다음', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should query the week after next when the user says 다다음 주', () => {
    expect(createCalendarQuery({now, text: '다다음 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-13T15:00:00.000Z',
    })
  })

  it('should query the month after next when the user says 다다음달', () => {
    expect(createCalendarQuery({now, text: '다다음달 일정 알려줘', timeZone})).toEqual({
      end: '2026-11-30T15:00:00.000Z',
      start: '2026-10-31T15:00:00.000Z',
    })
  })

  it('should query two weeks ago when the user says 지지난 주', () => {
    expect(createCalendarQuery({now, text: '지지난 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-08-23T15:00:00.000Z',
      start: '2026-08-16T15:00:00.000Z',
    })
  })
})

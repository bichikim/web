import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 오늘 오전', () => {
  it('should end at local noon when asking for this morning after noon', () => {
    const now = new Date('2026-09-04T04:00:00.000Z')

    expect(
      createCalendarQuery({now, text: '오늘 오전 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-04T03:00:00.000Z',
      start: '2026-09-03T15:00:00.000Z',
    })
  })

  it('should end at local noon when asking for this morning before noon', () => {
    const now = new Date('2026-09-03T23:00:00.000Z')

    expect(createCalendarQuery({now, text: '오늘 오전 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-04T03:00:00.000Z',
      start: '2026-09-03T23:00:00.000Z',
    })
  })
})

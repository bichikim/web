import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery today morning', () => {
  it('should query today morning from local midnight when requested after noon', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T04:00:00.000Z'),
        text: '오늘 오전 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-04T03:00:00.000Z',
      start: '2026-09-03T15:00:00.000Z',
    })
  })

  it('should query the remaining morning for today when the current time is before noon', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-03T23:00:00.000Z'),
        text: '오늘 오전 뭐 있어?',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-04T03:00:00.000Z',
      start: '2026-09-03T23:00:00.000Z',
    })
  })
})

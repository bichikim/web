import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU daypart exclusion', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should query tomorrow afternoon when morning is excluded in an explicit schedule query', () => {
    expect(
      createCalendarQuery({
        now,
        text: '오전 말고 오후 내일 일정 알려줘',
        timeZone,
      }),
    ).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-05T03:00:00.000Z',
    })
  })

  it('should query friday afternoon when morning is excluded on a weekday schedule query', () => {
    expect(
      createCalendarQuery({
        now,
        text: '금요일 오전 말고 오후 일정 알려줘',
        timeZone,
      }),
    ).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

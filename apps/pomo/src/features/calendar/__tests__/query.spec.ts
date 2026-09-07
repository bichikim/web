import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  it('should ignore text without a calendar intent', () => {
    expect(createCalendarQuery({now, text: '오늘 날씨 알려줘'})).toBeNull()
  })

  it('should query the remaining local day for today', () => {
    expect(
      createCalendarQuery({now, text: '오늘 일정 알려줘', timeZoneOffsetMinutes: 540}),
    ).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should query tomorrow in the local timezone', () => {
    expect(
      createCalendarQuery({now, text: '내일 오전에 뭐 있어?', timeZoneOffsetMinutes: 540}),
    ).toEqual({
      end: '2026-09-05T03:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
  })

  it('should query through Sunday for this week', () => {
    expect(
      createCalendarQuery({now, text: '이번 주 중요한 일정 알려줘', timeZoneOffsetMinutes: 540}),
    ).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should use a bounded future window for the next meeting', () => {
    expect(
      createCalendarQuery({now, text: '다음 미팅 언제야?', timeZoneOffsetMinutes: 540}),
    ).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

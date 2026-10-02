import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery approved local daypart windows', () => {
  it.each([
    ['새벽', '2026-09-04T15:00:00.000Z', '2026-09-04T21:00:00.000Z'],
    ['아침', '2026-09-04T21:00:00.000Z', '2026-09-05T01:00:00.000Z'],
    ['점심', '2026-09-05T02:00:00.000Z', '2026-09-05T05:00:00.000Z'],
    ['낮', '2026-09-05T00:00:00.000Z', '2026-09-05T09:00:00.000Z'],
    ['저녁', '2026-09-05T09:00:00.000Z', '2026-09-05T12:00:00.000Z'],
    ['밤', '2026-09-05T12:00:00.000Z', '2026-09-05T15:00:00.000Z'],
  ])('should use the approved local %s window for tomorrow', (daypart, start, end) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: `내일 ${daypart} 일정 알려줘`,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end, start})
  })

  it('should keep the approved 아침/낮 and 점심/낮 overlaps', () => {
    const morning = createCalendarQuery({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '내일 아침 일정 알려줘',
      timeZone: 'Asia/Seoul',
    })
    const lunch = createCalendarQuery({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '내일 점심 일정 알려줘',
      timeZone: 'Asia/Seoul',
    })
    const daytime = createCalendarQuery({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '내일 낮 일정 알려줘',
      timeZone: 'Asia/Seoul',
    })

    expect(morning).toEqual({
      end: '2026-09-05T01:00:00.000Z',
      start: '2026-09-04T21:00:00.000Z',
    })
    expect(lunch).toEqual({
      end: '2026-09-05T05:00:00.000Z',
      start: '2026-09-05T02:00:00.000Z',
    })
    expect(daytime).toEqual({
      end: '2026-09-05T09:00:00.000Z',
      start: '2026-09-05T00:00:00.000Z',
    })
  })

  it('should use the requested daypart after excluding a competing daypart', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '점심 말고 저녁 내일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-05T12:00:00.000Z',
      start: '2026-09-05T09:00:00.000Z',
    })
  })

  it('should use an unexcluded 점심 instead of an excluded 정오', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '정오 말고 점심 내일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-05T05:00:00.000Z',
      start: '2026-09-05T02:00:00.000Z',
    })
  })

  it('should narrow an implicit schedule question to the approved 점심 window', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '오늘 점심 뭐 있어?',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-04T05:00:00.000Z',
      start: '2026-09-04T02:00:00.000Z',
    })
  })

  it('should query all of 오늘 저녁 even when part of the window has passed', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '오늘 저녁 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-04T12:00:00.000Z',
      start: '2026-09-04T09:00:00.000Z',
    })
  })

  it('should clip 오늘 저녁 남은 일정 to the current time', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '오늘 저녁 남은 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-04T12:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should represent an expired remaining window as empty without advancing to tomorrow', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T12:30:00.000Z'),
        text: '오늘 저녁 남은 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({empty: true})
  })

  it('should preserve the existing multi-date range when a daypart is also mentioned', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '오늘 내일 저녁 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should resolve 내일 정오 as an exact local instant', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '내일 정오 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({at: '2026-09-05T03:00:00.000Z'})
  })

  it('should resolve 정오 through a daylight-saving transition in the requested zone', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-03-07T18:00:00.000Z'),
        text: '내일 정오 일정 알려줘',
        timeZone: 'America/New_York',
      }),
    ).toEqual({at: '2026-03-08T16:00:00.000Z'})
  })

  it('should resolve implicit 오늘 정오 questions as an exact local instant', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '오늘 정오 뭐 있어?',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({at: '2026-09-04T03:00:00.000Z'})
  })

  it('should preserve the requested zone when resolving a daypart across DST', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-03-07T18:00:00.000Z'),
        text: '내일 저녁 일정',
        timeZone: 'America/New_York',
      }),
    ).toEqual({
      end: '2026-03-09T01:00:00.000Z',
      start: '2026-03-08T22:00:00.000Z',
    })
  })
})

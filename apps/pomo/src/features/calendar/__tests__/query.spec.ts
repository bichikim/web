import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  it('should resolve tomorrow using local calendar dates across a year boundary', () => {
    const localNow = new Date(2026, 11, 31, 23, 30)
    expect(createCalendarQuery({now: localNow, text: '내일 일정'})).toEqual({
      end: new Date(2027, 0, 2).toISOString(),
      start: new Date(2027, 0, 1).toISOString(),
    })
    expect(localNow.getDate()).toBe(31)
  })

  it('should ignore text without a calendar intent', () => {
    expect(createCalendarQuery({now, text: '오늘 날씨 알려줘'})).toBeNull()
  })

  it('should query the remaining local day for today', () => {
    expect(createCalendarQuery({now, text: '오늘 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should query only the afternoon for today when the current time is before noon', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-03T23:00:00.000Z'),
        text: '오늘 오후 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T03:00:00.000Z',
    })
  })

  it('should query only the remaining afternoon for today when the current time is after noon', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T04:00:00.000Z'),
        text: '오늘 오후 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T04:00:00.000Z',
    })
  })

  it('should query the previous local day for yesterday', () => {
    expect(createCalendarQuery({now, text: '어제 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-03T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })

  it('should recognize an implicit schedule question about yesterday', () => {
    expect(createCalendarQuery({now, text: '어제 뭐 있었어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-03T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })

  it('should query yesterday across a daylight-saving transition', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-03-09T18:00:00.000Z'),
        text: '어제 일정 알려줘',
        timeZone: 'America/New_York',
      }),
    ).toEqual({end: '2026-03-09T04:00:00.000Z', start: '2026-03-08T05:00:00.000Z'})
  })

  it('should include the remaining local day when querying today and tomorrow', () => {
    expect(
      createCalendarQuery({now, text: '오늘 내일 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    '오늘 말고',
    '오늘 일정 말고',
    '오늘 빼고',
    '오늘 제외하고',
    '오늘 일정은 제외하고',
    '오늘은 아니고',
    '오늘이 아니라',
    '오늘이 아닌',
    '오늘은 아니다',
    '오늘은 안 되고',
    '오늘 안 돼',
  ])('should query only tomorrow when the question excludes today with %s', (exclusion) => {
    expect(
      createCalendarQuery({now, text: `${exclusion} 내일 일정 알려줘`, timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
  })

  it.each([
    '내일 말고',
    '내일 일정 말고',
    '내일 빼고',
    '내일 제외하고',
    '내일 일정은 제외하고',
    '내일은 아니고',
    '내일이 아니라',
    '내일이 아닌',
    '내일은 아니다',
    '내일은 안 되고',
    '내일 안 돼',
  ])('should query only today when the question excludes tomorrow with %s', (exclusion) => {
    expect(
      createCalendarQuery({now, text: `${exclusion} 오늘 일정 알려줘`, timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should query tomorrow in the local timezone', () => {
    expect(
      createCalendarQuery({now, text: '내일 오전에 뭐 있어?', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-05T03:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
  })

  it('should query only tomorrow afternoon', () => {
    expect(
      createCalendarQuery({now, text: '내일 오후 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-05T03:00:00.000Z',
    })
  })

  it('should query the day after tomorrow in the local timezone', () => {
    expect(createCalendarQuery({now, text: '모레 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-05T15:00:00.000Z',
    })
  })

  it('should query only the morning of the day after tomorrow', () => {
    expect(createCalendarQuery({now, text: '모레 오전 일정', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-06T03:00:00.000Z',
      start: '2026-09-05T15:00:00.000Z',
    })
  })

  it('should query only the afternoon of the day after tomorrow', () => {
    expect(createCalendarQuery({now, text: '모레 오후 일정', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-06T03:00:00.000Z',
    })
  })

  it('should recognize the day after tomorrow as an implicit schedule query', () => {
    expect(createCalendarQuery({now, text: '모레 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-05T15:00:00.000Z',
    })
  })

  it('should query through Sunday for this week', () => {
    expect(
      createCalendarQuery({now, text: '이번 주 중요한 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should query through Sunday for this week without a space', () => {
    expect(
      createCalendarQuery({now, text: '이번주 중요한 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should recognize this week without a space as an implicit schedule query', () => {
    expect(createCalendarQuery({now, text: '이번주 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each(['이번 주 말고 다음 주 일정 알려줘', '이번주 말고 다음주 일정 알려줘'])(
    'should query next week when this week is excluded in "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
        end: '2026-09-13T15:00:00.000Z',
        start: '2026-09-06T15:00:00.000Z',
      })
    },
  )

  it('should query this week when next week is excluded', () => {
    expect(
      createCalendarQuery({now, text: '다음 주 말고 이번 주 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should query next week from Monday through the following Monday', () => {
    expect(createCalendarQuery({now, text: '다음 주 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual(
      {
        end: '2026-09-13T15:00:00.000Z',
        start: '2026-09-06T15:00:00.000Z',
      },
    )
  })

  it('should recognize next week without a space as an implicit schedule query', () => {
    expect(createCalendarQuery({now, text: '다음주 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
    })
  })

  it('should start next week on Monday when queried on Sunday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-06T14:30:00.000Z'),
        text: '다음 주 일정',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
    })
  })

  it('should query the following week when queried on Monday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-07T02:30:00.000Z'),
        text: '다음 주 일정',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-13T15:00:00.000Z',
    })
  })

  it('should use each date offset when next week crosses daylight saving time', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-10-19T14:30:00.000Z'),
        text: '다음 주 일정',
        timeZone: 'America/New_York',
      }),
    ).toEqual({
      end: '2026-11-02T05:00:00.000Z',
      start: '2026-10-26T04:00:00.000Z',
    })
  })

  it('should use a bounded future window for the next meeting', () => {
    expect(createCalendarQuery({now, text: '다음 미팅 언제야?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

it.each([
  ['2026-03-07T18:00:00Z', '2026-03-08T05:00:00.000Z', '2026-03-09T04:00:00.000Z'],
  ['2026-10-31T18:00:00Z', '2026-11-01T04:00:00.000Z', '2026-11-02T05:00:00.000Z'],
])('should use the requested zone across daylight saving at %s', (now, start, end) => {
  expect(
    createCalendarQuery({now: new Date(now), text: '내일 일정', timeZone: 'America/New_York'}),
  ).toEqual({end, start})
})
it('should resolve tomorrow morning through DST in the requested zone', () => {
  expect(
    createCalendarQuery({
      now: new Date('2026-03-07T18:00:00Z'),
      text: '내일 오전 일정',
      timeZone: 'America/New_York',
    }),
  ).toEqual({end: '2026-03-08T16:00:00.000Z', start: '2026-03-08T05:00:00.000Z'})
})

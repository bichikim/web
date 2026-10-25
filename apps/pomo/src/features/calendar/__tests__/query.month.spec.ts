import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('calendar month queries', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it.each([
    {
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
      text: '이번 달',
    },
    {
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
      text: '이번달',
    },
    {
      end: '2026-10-31T15:00:00.000Z',
      start: '2026-09-30T15:00:00.000Z',
      text: '다음 달',
    },
    {
      end: '2026-10-31T15:00:00.000Z',
      start: '2026-09-30T15:00:00.000Z',
      text: '다음달',
    },
    {
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
      text: '지난 달',
    },
    {
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
      text: '지난달',
    },
    {
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
      text: '저번 달',
    },
    {
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
      text: '저번달',
    },
  ])('should query the local month for "$text"', ({end, start, text}) => {
    expect(createCalendarQuery({now, text: `${text} 일정 알려줘`, timeZone})).toEqual({end, start})
  })

  it('should prioritize the previous month over week and day phrases', () => {
    expect(createCalendarQuery({now, text: '저번달 지난 주 어제 일정 알려줘', timeZone})).toEqual({
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
    })
  })

  it.each(['저저번달 일정 알려줘', '저저번 달 일정 알려줘'])(
    'should not interpret an unsupported compound month prefix as the previous month for "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone})).toEqual({
        end: '2026-10-04T10:30:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      })
    },
  )

  it('should recognize an implicit schedule question about this month', () => {
    expect(createCalendarQuery({now, text: '이번달 뭐 있어?', timeZone})).toEqual({
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should not treat a month substring inside another word as a month query', () => {
    expect(createCalendarQuery({now, text: '이번 달력 일정 알려줘', timeZone})).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should keep multiple month phrases within the existing bounded query window', () => {
    expect(createCalendarQuery({now, text: '이번 달 다음 달 일정', timeZone})).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    {
      end: '2027-01-31T15:00:00.000Z',
      now: '2026-12-15T12:00:00.000Z',
      start: '2026-12-31T15:00:00.000Z',
      text: '다음 달',
    },
    {
      end: '2026-12-31T15:00:00.000Z',
      now: '2027-01-15T12:00:00.000Z',
      start: '2026-11-30T15:00:00.000Z',
      text: '지난 달',
    },
  ])('should cross a year boundary for "$text"', ({end, now, start, text}) => {
    expect(createCalendarQuery({now: new Date(now), text: `${text} 일정`, timeZone})).toEqual({
      end,
      start,
    })
  })

  it('should include the leap day in the previous local month', () => {
    expect(
      createCalendarQuery({
        now: new Date('2024-03-15T12:00:00.000Z'),
        text: '지난 달 일정',
        timeZone,
      }),
    ).toEqual({end: '2024-02-29T15:00:00.000Z', start: '2024-01-31T15:00:00.000Z'})
  })

  it('should use each local month boundary across daylight saving time', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-02-15T17:00:00.000Z'),
        text: '다음 달 일정',
        timeZone: 'America/New_York',
      }),
    ).toEqual({end: '2026-04-01T04:00:00.000Z', start: '2026-03-01T05:00:00.000Z'})
  })

  it('should use each local month boundary for a previous month alias across daylight saving time', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-04-15T16:00:00.000Z'),
        text: '저번달 일정',
        timeZone: 'America/New_York',
      }),
    ).toEqual({end: '2026-04-01T04:00:00.000Z', start: '2026-03-01T05:00:00.000Z'})
  })

  it.each([
    {
      end: '2026-10-31T15:00:00.000Z',
      start: '2026-09-30T15:00:00.000Z',
      text: '이번 달 말고 다음 달 일정',
    },
    {
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
      text: '지난 달 말고 이번 달 일정',
    },
    {
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
      text: '저번 달 말고 이번 달 일정',
    },
    {
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
      text: '이번 달 말고 저번달 일정',
    },
    {
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
      text: '다음 달 말고 저번 달 일정',
    },
  ])('should omit the excluded month in "$text"', ({end, start, text}) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({end, start})
  })
})

describe('calendar queries for two months ago', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'
  const expected = {end: '2026-07-31T15:00:00.000Z', start: '2026-06-30T15:00:00.000Z'}

  it.each([
    '지지난달 일정 알려줘',
    '지지난 달 일정 알려줘',
    '지지난달에는 뭐 있어?',
    '지난달 말고 지지난달 일정 알려줘',
    '지지난달 지난달 말고 일정 알려줘',
    '이번 달 말고 지지난달 일정 알려줘',
    '다음 주 수요일 말고 지지난달 일정 알려줘',
  ])('should request two local months ago for %s', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual(expected)
  })

  it('should use the previous month when two months ago is excluded', () => {
    expect(createCalendarQuery({now, text: '지지난달 말고 지난달 일정 알려줘', timeZone})).toEqual({
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
    })
  })

  it('should retain the bounded fallback for multiple requested months', () => {
    expect(createCalendarQuery({now, text: '지지난달 지난달 일정 알려줘', timeZone})).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: now.toISOString(),
    })
  })

  it('should cross a year boundary for two months ago', () => {
    expect(
      createCalendarQuery({
        now: new Date('2027-01-15T12:00:00.000Z'),
        text: '지지난달 일정 알려줘',
        timeZone,
      }),
    ).toEqual({
      end: '2026-11-30T15:00:00.000Z',
      start: '2026-10-31T15:00:00.000Z',
    })
  })

  it.each(['초지지난달 뭐 있어?', '지지지난달 뭐 있어?', '지지난달력 뭐 있어?'])(
    'should not recognize a month inside %s',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone})).toBeNull()
    },
  )
})

it.each([
  {
    expected: {end: '2024-02-29T15:00:00.000Z', start: '2024-01-31T15:00:00.000Z'},
    now: '2024-04-15T10:30:00.000Z',
    timeZone: 'Asia/Seoul',
  },
  {
    expected: {end: '2026-04-01T04:00:00.000Z', start: '2026-03-01T05:00:00.000Z'},
    now: '2026-05-15T10:30:00.000Z',
    timeZone: 'America/New_York',
  },
])('should preserve local month boundaries for $timeZone at $now', ({now, timeZone, expected}) => {
  expect(createCalendarQuery({now: new Date(now), text: '지지난달 일정 알려줘', timeZone})).toEqual(
    expected,
  )
})

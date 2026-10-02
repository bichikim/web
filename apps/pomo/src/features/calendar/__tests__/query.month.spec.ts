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

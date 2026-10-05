import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('previous-week calendar queries', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const expectedPreviousWeek = {
    end: '2026-08-30T15:00:00.000Z',
    start: '2026-08-23T15:00:00.000Z',
  }

  it.each(['지난주', '저번주', '지난 주', '저번 주'])(
    'should query the previous local week for "%s"',
    (week) => {
      expect(
        createCalendarQuery({
          now,
          text: `${week} 일정 알려줘`,
          timeZone: 'Asia/Seoul',
        }),
      ).toEqual(expectedPreviousWeek)
    },
  )

  it.each(['지지난주', '지지난 주'])('should query two local weeks ago for "%s"', (week) => {
    expect(
      createCalendarQuery({
        now,
        text: `${week} 일정 알려줘`,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-08-23T15:00:00.000Z',
      start: '2026-08-16T15:00:00.000Z',
    })
  })

  it('should recognize two weeks ago as an implicit schedule query', () => {
    expect(createCalendarQuery({now, text: '지지난주 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-08-23T15:00:00.000Z',
      start: '2026-08-16T15:00:00.000Z',
    })
  })

  it.each([
    {
      expected: expectedPreviousWeek,
      text: '지지난주 말고 지난주 일정 알려줘',
    },
    {
      expected: {
        end: '2026-08-23T15:00:00.000Z',
        start: '2026-08-16T15:00:00.000Z',
      },
      text: '지난주 말고 지지난주 일정 알려줘',
    },
    {
      expected: {
        end: '2026-09-06T15:00:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      },
      text: '지지난주 제외하고 이번 주 일정 알려줘',
    },
    {
      expected: {
        end: '2026-09-13T15:00:00.000Z',
        start: '2026-09-06T15:00:00.000Z',
      },
      text: '지지난주 제외하고 다음 주 일정 알려줘',
    },
  ])('should honor exclusions between week phrases in "$text"', ({expected, text}) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })

  it('should keep month selection ahead of a two-weeks-ago phrase', () => {
    expect(
      createCalendarQuery({now, text: '지지난주 지난달 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-08-31T15:00:00.000Z',
      start: '2026-07-31T15:00:00.000Z',
    })
  })

  it.each(['저번달', '저번 달'])(
    'should keep the previous-month alias ahead of a two-weeks-ago phrase for "%s"',
    (month) => {
      expect(
        createCalendarQuery({now, text: `지지난주 ${month} 일정 알려줘`, timeZone: 'Asia/Seoul'}),
      ).toEqual({
        end: '2026-08-31T15:00:00.000Z',
        start: '2026-07-31T15:00:00.000Z',
      })
    },
  )

  it('should extend a two-weeks-ago range through an explicitly requested date', () => {
    expect(
      createCalendarQuery({now, text: '지지난주, 오늘 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-08-16T15:00:00.000Z',
    })
  })

  it.each([
    {
      expected: expectedPreviousWeek,
      now: '2026-09-07T00:30:00.000Z',
      timeZone: 'Asia/Seoul',
    },
    {
      expected: {
        end: '2026-08-23T15:00:00.000Z',
        start: '2026-08-16T15:00:00.000Z',
      },
      now: '2026-09-06T14:30:00.000Z',
      timeZone: 'Asia/Seoul',
    },
    {
      expected: {
        end: '2026-12-27T15:00:00.000Z',
        start: '2026-12-20T15:00:00.000Z',
      },
      now: '2027-01-04T00:30:00.000Z',
      timeZone: 'Asia/Seoul',
    },
    {
      expected: {
        end: '2026-11-02T05:00:00.000Z',
        start: '2026-10-26T04:00:00.000Z',
      },
      now: '2026-11-11T17:00:00.000Z',
      timeZone: 'America/New_York',
    },
  ])(
    'should resolve two-weeks-ago Monday boundaries for $now in $timeZone',
    ({expected, now: queryNow, timeZone}) => {
      expect(
        createCalendarQuery({
          now: new Date(queryNow),
          text: '지지난 주 일정 알려줘',
          timeZone,
        }),
      ).toEqual(expected)
    },
  )

  it('should not recognize a two-weeks-ago phrase embedded in a longer word', () => {
    expect(
      createCalendarQuery({now, text: '초지지난주 뭐 있어?', timeZone: 'Asia/Seoul'}),
    ).toBeNull()
  })

  it('should recognize previous week as an implicit schedule query', () => {
    expect(createCalendarQuery({now, text: '지난주 뭐 있어?', timeZone: 'Asia/Seoul'})).toEqual(
      expectedPreviousWeek,
    )
  })

  it('should not treat a previous-week substring inside a longer word as an intent', () => {
    expect(
      createCalendarQuery({now, text: '지난 주식 뭐 있어?', timeZone: 'Asia/Seoul'}),
    ).toBeNull()
  })

  it.each([
    {
      expected: {
        end: '2026-09-06T15:00:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      },
      text: '지난주 말고 이번 주 일정 알려줘',
    },
    {
      expected: {
        end: '2026-09-13T15:00:00.000Z',
        start: '2026-09-06T15:00:00.000Z',
      },
      text: '저번 주 제외하고 다음 주 일정 알려줘',
    },
  ])('should honor an excluded previous week in "$text"', ({expected, text}) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })

  it('should include an explicitly requested date after the previous week', () => {
    expect(
      createCalendarQuery({now, text: '지난주, 오늘 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: expectedPreviousWeek.start,
    })
  })

  it('should keep previous-weekend intent separate from previous-week intent', () => {
    expect(
      createCalendarQuery({now, text: '지난 주말 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-08-30T15:00:00.000Z',
      start: '2026-08-28T15:00:00.000Z',
    })
  })

  it('should use the time-zone offset at each boundary across daylight saving time', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-11-04T17:00:00.000Z'),
        text: '지난 주 일정',
        timeZone: 'America/New_York',
      }),
    ).toEqual({
      end: '2026-11-02T05:00:00.000Z',
      start: '2026-10-26T04:00:00.000Z',
    })
  })
})

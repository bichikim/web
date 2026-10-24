import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery this-week weekdays', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  it.each([
    {
      expected: {end: '2026-08-31T15:00:00.000Z', start: '2026-08-30T15:00:00.000Z'},
      text: '이번 주 월요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-01T15:00:00.000Z', start: '2026-08-31T15:00:00.000Z'},
      text: '이번 주 화요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-02T15:00:00.000Z', start: '2026-09-01T15:00:00.000Z'},
      text: '이번 주 수요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-03T15:00:00.000Z', start: '2026-09-02T15:00:00.000Z'},
      text: '이번 주 목요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-04T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'},
      text: '이번 주 금요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-05T15:00:00.000Z', start: '2026-09-04T15:00:00.000Z'},
      text: '이번 주 토요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-05T15:00:00.000Z'},
      text: '이번 주 일요일 일정 알려줘',
    },
  ])('should query only the named local day in "$text"', ({expected, text}) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })

  it.each(['이번 주에 금요일 일정 알려줘', '이번주금요일 일정 알려줘'])(
    'should recognize a particle or compact spelling in "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
        end: '2026-09-04T15:00:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      })
    },
  )

  it('should keep a past morning inside the named weekday when today is already after noon', () => {
    expect(
      createCalendarQuery({now, text: '이번 주 금요일 오전 일정 알려줘', timeZone: 'Asia/Seoul'}),
    ).toEqual({
      end: '2026-09-04T03:00:00.000Z',
      start: '2026-09-03T15:00:00.000Z',
    })
  })

  it.each([
    {
      expected: {end: '2026-03-09T04:00:00.000Z', start: '2026-03-08T05:00:00.000Z'},
      now: '2026-03-06T12:00:00.000Z',
    },
    {
      expected: {end: '2026-11-02T05:00:00.000Z', start: '2026-11-01T04:00:00.000Z'},
      now: '2026-10-30T12:00:00.000Z',
    },
  ])(
    'should use local midnight boundaries when this-week Sunday crosses DST for "$now"',
    ({expected, now}) => {
      expect(
        createCalendarQuery({
          now: new Date(now),
          text: '이번 주 일요일 일정 알려줘',
          timeZone: 'America/New_York',
        }),
      ).toEqual(expected)
    },
  )
})

describe('createCalendarQuery this-week weekday composition', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it.each([
    '이번 주 금요일 뭐 있어?',
    '이번주금요일 뭐 있어?',
    '이번 주 월요일 말고 금요일 일정 알려줘',
  ])('should keep the selected Friday for "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    '이번 주 금요일 말고 다음 주 월요일 일정 알려줘',
    '이번주금요일 말고 다음 주 월요일 일정 알려줘',
  ])('should keep a competing next-week clause after excluding "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-09-07T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
    })
  })

  it('should keep the previous-month alias ahead of a named this-week day', () => {
    expect(createCalendarQuery({now, text: '이번 주 금요일 저번달 일정 알려줘', timeZone})).toEqual(
      {
        end: '2026-08-31T15:00:00.000Z',
        start: '2026-07-31T15:00:00.000Z',
      },
    )
  })

  it.each(['저이번주금요일 일정 알려줘', '이번주금요일표 일정 알려줘'])(
    'should keep an unsupported word from becoming a compact weekday in "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone})).toEqual({
        end: '2026-10-04T10:30:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      })
    },
  )

  it('should keep the current week fallback for multiple named weekdays', () => {
    expect(
      createCalendarQuery({now, text: '이번 주 월요일, 금요일 일정 알려줘', timeZone}),
    ).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should resolve noon on the requested current-week day as an instant', () => {
    expect(createCalendarQuery({now, text: '이번 주 금요일 정오 일정 알려줘', timeZone})).toEqual({
      at: '2026-09-04T03:00:00.000Z',
    })
  })

  it('should reuse the full evening window on the named current-week day', () => {
    expect(createCalendarQuery({now, text: '이번 주 금요일 저녁 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-04T12:00:00.000Z',
      start: '2026-09-04T09:00:00.000Z',
    })
  })
  it.each([
    '이번 주간 월요일 일정',
    '이번 주 말고 월요일 일정',
    '이번 주는 말고 월요일 일정',
    '이번 주 빼고 월요일 일정',
    '이번 주에 말고 월요일 일정',
  ])('should preserve an unsupported prefix or excluded week in "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    {
      end: '2026-09-06T15:00:00.000Z',
      text: '이번 주 금요일 일정과 토요일 일정 알려줘',
    },
    {
      end: '2026-09-06T15:00:00.000Z',
      text: '이번주금요일 일정과 토요일 일정 알려줘',
    },
    {
      end: '2026-09-06T15:00:00.000Z',
      text: '이번주금요일 일정과 이번주토요일 일정 알려줘',
    },
    {
      end: '2026-10-04T10:30:00.000Z',
      text: '이번 주 월요일 말고 금요일 일정과 토요일 일정 알려줘',
    },
    {
      end: '2026-10-04T10:30:00.000Z',
      text: '금요일 일정과 토요일 말고 일정 알려줘',
    },
  ])('should preserve the fallback for separate weekday clauses in "$text"', ({end, text}) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end,
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    '이번 주의 금요일 일정 알려줘',
    '이번주의 금요일 일정 알려줘',
    '이번 주에 금요일 뭐 있어?',
    '이번 주의 금요일 뭐 있어?',
    '이번 주에는 금요일 뭐 있어?',
  ])('should select Friday after a supported week particle in "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    '이번 주 금요일 말고 토요일 뭐 있어?',
    '이번주금요일 말고 토요일 뭐 있어?',
    '이번 주의 금요일 말고 토요일 뭐 있어?',
  ])('should reuse the implicit exclusion grammar for "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
  })

  it.each([
    '이번 주 금요일과 토요일 뭐 있어?',
    '이번주금요일과 토요일 뭐 있어?',
    '이번 주에 금요일과 토요일 뭐 있어?',
  ])('should preserve the week fallback for an implicit weekday list in "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should reuse the implicit exclusion and daypart grammar for the selected Saturday', () => {
    expect(
      createCalendarQuery({now, text: '이번 주 금요일 말고 토요일 오전 뭐 있어?', timeZone}),
    ).toEqual({
      end: '2026-09-05T03:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
  })

  it.each([
    '이번 주 금요일 말고 뭐 있어?',
    '이번주금요일 말고 뭐 있어?',
    '저이번주금요일 말고 토요일 뭐 있어?',
  ])('should keep an empty or unsupported implicit weekday request unqueried in "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toBeNull()
  })
})

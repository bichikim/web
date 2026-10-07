import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery next-week weekdays', () => {
  it.each([
    {
      expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
      text: '다음 주 월요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'},
      text: '다음 주 화요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-09T15:00:00.000Z', start: '2026-09-08T15:00:00.000Z'},
      text: '다음 주 수요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-10T15:00:00.000Z', start: '2026-09-09T15:00:00.000Z'},
      text: '다음 주 목요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-11T15:00:00.000Z', start: '2026-09-10T15:00:00.000Z'},
      text: '다음 주 금요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-12T15:00:00.000Z', start: '2026-09-11T15:00:00.000Z'},
      text: '다음 주 토요일 일정 알려줘',
    },
    {
      expected: {end: '2026-09-13T15:00:00.000Z', start: '2026-09-12T15:00:00.000Z'},
      text: '다음 주 일요일 일정 알려줘',
    },
  ])('should query the exact local day for "$text"', ({expected, text}) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual(expected)
  })

  it.each(['다음 주 수요일 뭐 있어?', '다음주수요일 뭐 있어?'])(
    'should recognize an implicit schedule question for "%s"',
    (text) => {
      expect(
        createCalendarQuery({
          now: new Date('2026-09-04T10:30:00.000Z'),
          text,
          timeZone: 'Asia/Seoul',
        }),
      ).toEqual({end: '2026-09-09T15:00:00.000Z', start: '2026-09-08T15:00:00.000Z'})
    },
  )

  it('should select the non-excluded weekday in next week', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 수요일 말고 목요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-10T15:00:00.000Z', start: '2026-09-09T15:00:00.000Z'})
  })

  it.each(['빼고', '제외하고', '아니고', '안 돼'])(
    'should select the remaining weekday after excluding Wednesday with "%s"',
    (exclusion) => {
      expect(
        createCalendarQuery({
          now: new Date('2026-09-04T10:30:00.000Z'),
          text: `다음 주 수요일 ${exclusion} 목요일 일정 알려줘`,
          timeZone: 'Asia/Seoul',
        }),
      ).toEqual({end: '2026-09-10T15:00:00.000Z', start: '2026-09-09T15:00:00.000Z'})
    },
  )

  it('should not interpret a weekday substring in "지금" as a requested weekday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 일정 지금 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-13T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it('should not interpret the ability noun "수" as Wednesday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 월요일 일정 확인해 줄 수 있어?',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it.each([
    '다음 주 월요일 일정 알려줄 수는 있어?',
    '다음 주 월요일 일정 중 할 일 알려줘',
    '다음 주 월요일에 할 수 있는 일정 알려줘',
    '다음 주 월요일 할 일과 일정 알려줘',
  ])('should stop weekday matching after the requested date expression in "%s"', (text) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it.each(['다음 주 월요일, 수요일 일정 알려줘', '다음 주 월요일부터 수요일까지 일정 알려줘'])(
    'should keep connected weekday lists and ranges in "%s"',
    (text) => {
      expect(
        createCalendarQuery({
          now: new Date('2026-09-04T10:30:00.000Z'),
          text,
          timeZone: 'Asia/Seoul',
        }),
      ).toEqual({end: '2026-09-09T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
    },
  )

  it.each([
    '다음 주 수요일 말고 다다음 주 일정 알려줘',
    '다다음 주 일정, 다음 주 수요일 말고 일정 알려줘',
    '다음 주 수요일 일정 말고 다다음 주 일정 알려줘',
    '다음 주 수요일은 일정 말고 다다음 주 일정 알려줘',
    '다음 주 월요일 일정 말고 화요일 말고 다다음 주 일정 알려줘',
  ])('should exclude a next-week weekday clause before or after another period in "%s"', (text) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-20T15:00:00.000Z', start: '2026-09-13T15:00:00.000Z'})
  })

  it('should not interpret the ability noun "수" in a negative question as Wednesday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 월요일 일정 확인해 줄 수 없을까?',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it('should exclude a weekday followed by "에는 안 되고" before another weekday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 수요일에는 안 되고 목요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-10T15:00:00.000Z', start: '2026-09-09T15:00:00.000Z'})
  })

  it('should exclude a weekday when its particle introduces a schedule exclusion', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 수요일은 일정 말고 목요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-10T15:00:00.000Z', start: '2026-09-09T15:00:00.000Z'})
  })

  it('should not use a later period weekday to narrow the whole next week', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 일정, 다다음 주 수요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-20T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it('should not stop weekday scanning inside a longer period-like word', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 월요일 다다음 주식 화요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it('should not treat an event-type exclusion as an excluded weekday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 수요일 일정은 회의 말고 약속만 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-09T15:00:00.000Z', start: '2026-09-08T15:00:00.000Z'})
  })

  it('should not let a later-period exclusion remove an earlier weekday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 수요일 다다음 주 말고 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-09T15:00:00.000Z', start: '2026-09-08T15:00:00.000Z'})
  })

  it('should fall back to the whole week when every requested weekday is excluded', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 월요일 말고 화요일 말고 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-13T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it('should resolve next Monday as the week start when today is Sunday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-06T14:30:00.000Z'),
        text: '다음 주 월요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'})
  })

  it('should continue through the week after next when both periods are requested', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '다음 주 수요일 다다음 주 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-20T15:00:00.000Z', start: '2026-09-08T15:00:00.000Z'})
  })

  it('should keep this week when a next-week weekday is also requested', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '이번 주 다음 주 수요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-09T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'})
  })

  it.each([
    {
      expected: {end: '2026-03-09T04:00:00.000Z', start: '2026-03-08T05:00:00.000Z'},
      now: '2026-02-27T17:00:00.000Z',
    },
    {
      expected: {end: '2026-11-02T05:00:00.000Z', start: '2026-11-01T04:00:00.000Z'},
      now: '2026-10-23T16:00:00.000Z',
    },
  ])(
    'should use exact local-day boundaries when next-week Sunday crosses DST',
    ({expected, now}) => {
      expect(
        createCalendarQuery({
          now: new Date(now),
          text: '다음 주 일요일 일정 알려줘',
          timeZone: 'America/New_York',
        }),
      ).toEqual(expected)
    },
  )
})

describe('createCalendarQuery implicit weekday questions', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  it.each([
    ['일요일 뭐 있어?', '2026-09-05T15:00:00.000Z', '2026-09-06T15:00:00.000Z'],
    ['월요일 뭐 있어?', '2026-09-06T15:00:00.000Z', '2026-09-07T15:00:00.000Z'],
    ['화요일 뭐 있어?', '2026-09-07T15:00:00.000Z', '2026-09-08T15:00:00.000Z'],
    ['수요일 뭐 있어?', '2026-09-08T15:00:00.000Z', '2026-09-09T15:00:00.000Z'],
    ['목요일 뭐 있어?', '2026-09-09T15:00:00.000Z', '2026-09-10T15:00:00.000Z'],
    ['금요일 뭐 있어?', '2026-09-04T10:30:00.000Z', '2026-09-04T15:00:00.000Z'],
    ['토요일 뭐 있어?', '2026-09-04T15:00:00.000Z', '2026-09-05T15:00:00.000Z'],
  ])('should query the upcoming local weekday for "%s"', (text, start, end) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({end, start})
  })

  it('should use local midnight boundaries when an implicit weekday crosses daylight saving time', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-03-06T12:00:00.000Z'),
        text: '일요일 뭐 있어?',
        timeZone: 'America/New_York',
      }),
    ).toEqual({end: '2026-03-09T04:00:00.000Z', start: '2026-03-08T05:00:00.000Z'})
  })

  it.each([
    '수요일 말고 목요일 뭐 있어?',
    '수요일 빼고 목요일 뭐 있어?',
    '수요일 제외하고 목요일 뭐 있어?',
    '수요일은 제외하고 목요일 뭐 있어?',
    '수요일이 아닌 목요일 뭐 있어?',
    '수요일 안 되고 목요일 뭐 있어?',
  ])('should skip an excluded weekday in "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-10T15:00:00.000Z',
      start: '2026-09-09T15:00:00.000Z',
    })
  })

  it('should not fall back to a broad window when the only weekday is excluded', () => {
    expect(
      createCalendarQuery({now, text: '수요일 말고 뭐 있어?', timeZone: 'Asia/Seoul'}),
    ).toBeNull()
  })

  it('should keep a same-day morning weekday query within the local day', () => {
    expect(
      createCalendarQuery({now, text: '금요일 오전 뭐 있어?', timeZone: 'Asia/Seoul'}),
    ).toEqual({end: '2026-09-04T03:00:00.000Z', start: '2026-09-03T15:00:00.000Z'})
  })

  it('should start a same-day weekday afternoon query at the current time', () => {
    expect(
      createCalendarQuery({now, text: '금요일 오후 뭐 있어?', timeZone: 'Asia/Seoul'}),
    ).toEqual({end: '2026-09-04T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'})
  })

  it('should ignore a weekday in an unrelated implicit question', () => {
    expect(
      createCalendarQuery({now, text: '수요일 날씨 뭐 있어?', timeZone: 'Asia/Seoul'}),
    ).toBeNull()
  })

  it.each(['매수요일 뭐 있어?', '수요일날씨 뭐 있어?'])(
    'should require a weekday boundary in "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toBeNull()
    },
  )
})

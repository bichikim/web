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

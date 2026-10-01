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
  ])('should query only the named local day in "%text"', ({expected, text}) => {
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
    'should use local midnight boundaries when this-week Sunday crosses DST',
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

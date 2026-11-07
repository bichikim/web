/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'
const weeks = [
  {monday: '2026-09-14', phrase: '다다음 주'},
  {monday: '2026-08-24', phrase: '지난 주'},
]
const weekdays = ['월', '화', '수', '목', '금', '토', '일']

describe('createCalendarQuery qualified weekdays', () => {
  it.each(weeks.flatMap((week) => weekdays.map((weekday, offset) => ({...week, offset, weekday}))))(
    'should select the full local $phrase $weekday요일',
    ({monday, offset, phrase, weekday}) => {
      const start = new Date(`${monday}T00:00:00+09:00`).getTime() + offset * 86_400_000
      expect(
        createCalendarQuery({now, text: `${phrase} ${weekday}요일 일정 알려줘`, timeZone}),
      ).toEqual({
        end: new Date(start + 86_400_000).toISOString(),
        start: new Date(start).toISOString(),
      })
    },
  )

  it.each(['지난주', '저번 주', '저번주'])(
    'should reuse the existing previous-week alias %s',
    (phrase) => {
      expect(createCalendarQuery({now, text: `${phrase} 수요일 일정 알려줘`, timeZone})).toEqual({
        end: '2026-08-26T15:00:00.000Z',
        start: '2026-08-25T15:00:00.000Z',
      })
    },
  )

  it.each(
    weeks.flatMap((week) =>
      ['오전', '오후', '정오', '오전 말고 오후'].map((part) => ({...week, part})),
    ),
  )('should retain full-day grounding for $phrase Tuesday $part', ({monday, part, phrase}) => {
    const start = new Date(`${monday}T00:00:00+09:00`).getTime() + 86_400_000
    expect(
      createCalendarQuery({now, text: `${phrase} 화요일 ${part} 일정 알려줘`, timeZone}),
    ).toEqual({
      end: new Date(start + 86_400_000).toISOString(),
      start: new Date(start).toISOString(),
    })
  })

  it.each(weeks)('should preserve existing excluded-period handling within $phrase', ({phrase}) => {
    expect(
      createCalendarQuery({now, text: `${phrase} 화요일 말고 수요일 일정 알려줘`, timeZone}),
    ).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each(
    weeks.flatMap((week) =>
      ['화요일, 목요일', '화요일부터 목요일까지'].map((days) => ({...week, days})),
    ),
  )(
    'should preserve the existing range for multiple weekdays in $phrase $days',
    ({days, monday, phrase}) => {
      const start = new Date(`${monday}T00:00:00+09:00`).getTime()
      expect(createCalendarQuery({now, text: `${phrase} ${days} 일정 알려줘`, timeZone})).toEqual({
        end: new Date(start + 7 * 86_400_000).toISOString(),
        start: new Date(start).toISOString(),
      })
    },
  )

  it.each([
    {
      end: '2026-03-09T04:00:00.000Z',
      now: '2026-02-20T17:00:00.000Z',
      phrase: '다다음 주',
      start: '2026-03-08T05:00:00.000Z',
    },
    {
      end: '2026-03-09T04:00:00.000Z',
      now: '2026-03-13T17:00:00.000Z',
      phrase: '지난 주',
      start: '2026-03-08T05:00:00.000Z',
    },
    {
      end: '2026-11-02T05:00:00.000Z',
      now: '2026-10-16T16:00:00.000Z',
      phrase: '다다음 주',
      start: '2026-11-01T04:00:00.000Z',
    },
    {
      end: '2026-11-02T05:00:00.000Z',
      now: '2026-11-06T17:00:00.000Z',
      phrase: '지난 주',
      start: '2026-11-01T04:00:00.000Z',
    },
  ])(
    'should resolve both DST boundaries for $phrase at $now',
    ({end, now: instant, phrase, start}) => {
      expect(
        createCalendarQuery({
          now: new Date(instant),
          text: `${phrase} 일요일 일정 알려줘`,
          timeZone: 'America/New_York',
        }),
      ).toEqual({end, start})
    },
  )

  it.each([
    {
      end: '2026-12-30T15:00:00.000Z',
      now: '2027-01-04T00:30:00.000Z',
      start: '2026-12-29T15:00:00.000Z',
      text: '지난 주 수요일 일정 알려줘',
    },
    {
      end: '2027-01-05T15:00:00.000Z',
      now: '2026-12-25T10:30:00.000Z',
      start: '2027-01-04T15:00:00.000Z',
      text: '다다음 주 화요일 일정 알려줘',
    },
    {
      end: '2026-08-19T15:00:00.000Z',
      now: '2026-08-30T14:30:00.000Z',
      start: '2026-08-18T15:00:00.000Z',
      text: '지난 주 수요일 일정 알려줘',
    },
    {
      end: '2026-09-08T15:00:00.000Z',
      now: '2026-08-30T14:30:00.000Z',
      start: '2026-09-07T15:00:00.000Z',
      text: '다다음 주 화요일 일정 알려줘',
    },
  ])(
    'should keep local week selection at year and Sunday boundaries for $text at $now',
    ({end, now: instant, start, text}) => {
      expect(createCalendarQuery({now: new Date(instant), text, timeZone})).toEqual({end, start})
    },
  )

  it.each([
    {
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
      text: '다음 주 일정, 다다음 주 수요일 일정 알려줘',
    },
    {
      end: '2026-09-08T15:00:00.000Z',
      start: '2026-08-23T15:00:00.000Z',
      text: '지난 주 수요일, 다음 주 화요일 일정 알려줘',
    },
    {
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-08-23T15:00:00.000Z',
      text: '지난 주 수요일, 오늘 일정 알려줘',
    },
    {
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
      text: '다다음 주 화요일, 오늘 일정 알려줘',
    },
    {
      end: '2026-09-08T15:00:00.000Z',
      start: '2026-09-07T15:00:00.000Z',
      text: '다다음 주 말고 다음 주 화요일 일정 알려줘',
    },
    {
      end: '2026-09-08T15:00:00.000Z',
      start: '2026-09-07T15:00:00.000Z',
      text: '지난 주 말고 다음 주 화요일 일정 알려줘',
    },
    {
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-13T15:00:00.000Z',
      text: '다다음 주 화요일, 다다음 주 전체 일정 알려줘',
    },
    {
      end: '2026-08-30T15:00:00.000Z',
      start: '2026-08-23T15:00:00.000Z',
      text: '지난 주 수요일, 지난 주 전체 일정 알려줘',
    },
    {
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
      text: '이번 달 일정, 지난 주 수요일 일정 알려줘',
    },
  ])('should preserve the existing mixed-period range for $text', ({end, start, text}) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({end, start})
  })
})

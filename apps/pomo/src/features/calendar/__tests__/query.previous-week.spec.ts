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

import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery standalone weekdays', () => {
  it('should query the next local occurrence of an explicit weekday', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '수요일 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-09T15:00:00.000Z',
      start: '2026-09-08T15:00:00.000Z',
    })
  })

  it('should retain the standalone weekday range when excluding an event type', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: '수요일 일정은 회의 말고 약속만 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-09-09T15:00:00.000Z',
      start: '2026-09-08T15:00:00.000Z',
    })
  })

  it.each(['수요일 일정은 회의 말고 목요일 일정 알려줘', '수요일 일정은 회의 말고 목 일정 알려줘'])(
    'should not narrow a second weekday after an event-type exclusion in "%s"',
    (text) => {
      expect(
        createCalendarQuery({
          now: new Date('2026-09-04T10:30:00.000Z'),
          text,
          timeZone: 'Asia/Seoul',
        }),
      ).toEqual({
        end: '2026-10-04T10:30:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      })
    },
  )

  it.each(['수요일 일정과 목요일 일정 알려줘', '수요일 일정과 목 일정 알려줘'])(
    'should not narrow a second weekday after the calendar intent in "%s"',
    (text) => {
      expect(
        createCalendarQuery({
          now: new Date('2026-09-04T10:30:00.000Z'),
          text,
          timeZone: 'Asia/Seoul',
        }),
      ).toEqual({
        end: '2026-10-04T10:30:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      })
    },
  )

  it.each([
    ['일요일', '2026-09-05T15:00:00.000Z', '2026-09-06T15:00:00.000Z'],
    ['월요일', '2026-09-06T15:00:00.000Z', '2026-09-07T15:00:00.000Z'],
    ['화요일', '2026-09-07T15:00:00.000Z', '2026-09-08T15:00:00.000Z'],
    ['목요일', '2026-09-09T15:00:00.000Z', '2026-09-10T15:00:00.000Z'],
    ['금요일', '2026-09-04T10:30:00.000Z', '2026-09-04T15:00:00.000Z'],
    ['토요일', '2026-09-04T15:00:00.000Z', '2026-09-05T15:00:00.000Z'],
  ])('should query the upcoming local day for %s', (weekday, start, end) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: `${weekday} 일정 알려줘`,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end, start})
  })

  it.each([
    '다음 수요일',
    '이번 수요일',
    '지난 수요일',
    '저번 수요일',
    '오는 수요일',
    '다가오는 수요일',
    '다다음 수요일',
    '지지난 수요일',
    '매주 수요일',
  ])('should preserve existing behavior for qualified weekday "%s"', (weekday) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text: `${weekday} 일정 알려줘`,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    ['수요일 말고 목요일 일정 알려줘', '2026-10-04T10:30:00.000Z'],
    ['수요일과 목요일 일정 알려줘', '2026-10-04T10:30:00.000Z'],
    ['다음 주 수요일 일정 알려줘', '2026-09-09T15:00:00.000Z'],
  ])('should preserve existing weekday context for "%s"', (text, end) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({
      end,
      start:
        text === '다음 주 수요일 일정 알려줘'
          ? '2026-09-08T15:00:00.000Z'
          : '2026-09-04T10:30:00.000Z',
    })
  })

  it.each([
    ['금요일 오전 일정 알려줘', '2026-09-03T15:00:00.000Z', '2026-09-04T03:00:00.000Z'],
    ['금요일 오후 일정 알려줘', '2026-09-04T10:30:00.000Z', '2026-09-04T15:00:00.000Z'],
  ])('should preserve same-day daypart boundaries for "%s"', (text, start, end) => {
    expect(
      createCalendarQuery({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text,
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end, start})
  })

  it('should use date-specific local boundaries when the weekday crosses daylight saving time', () => {
    expect(
      createCalendarQuery({
        now: new Date('2026-03-06T12:00:00.000Z'),
        text: '일요일 일정 알려줘',
        timeZone: 'America/New_York',
      }),
    ).toEqual({end: '2026-03-09T04:00:00.000Z', start: '2026-03-08T05:00:00.000Z'})
  })
})

import {describe, expect, it} from 'vitest'

import {createCalendarWeekdayParser} from '../weekday-expression'

const createParser = () =>
  createCalendarWeekdayParser({
    calendarIntentPattern: /일정/u,
    calendarPeriodBoundaryPattern: /(?=$|[\s,.!?…]|과|와)/u,
    calendarPeriodParticlePattern: /(?:과|와)/u,
    calendarRemainingSchedulePattern: /남은\s*일정/u,
    calendarWordStartPattern: '(?<![\\p{L}\\p{N}_])',
  })

describe('createCalendarWeekdayParser', () => {
  it('should retain connected weekday offsets in expression order', () => {
    expect(createParser().getWeekdayIntent('월요일과 화요일, 수요일 일정')).toEqual({
      hasExcludedWeekday: false,
      offsets: [0, 1, 2],
    })
  })

  it('should stop at the first disconnected bare weekday before a later explicit weekday', () => {
    expect(createParser().getWeekdayIntent('월요일 잡담 수 목요일 일정')).toEqual({
      hasExcludedWeekday: false,
      offsets: [0],
    })
  })

  it('should connect an explicit weekday across a separator before a disconnected bare weekday', () => {
    expect(
      createParser().getWeekdayIntent('월요일 잘 모르겠지만 수요일 연결 안 되는 목 일정'),
    ).toEqual({
      hasExcludedWeekday: false,
      offsets: [0, 2],
    })
  })

  it('should stop the exclusion continuation at its first disconnected bare weekday', () => {
    expect(createParser().getWeekdayIntent('월요일 일정 말고 화요일 잡담 수 목요일')).toEqual({
      hasExcludedWeekday: true,
      offsets: [1],
    })
  })
})

/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for month phrases', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const defaultWindow = {
    end: '2026-10-04T10:30:00.000Z',
    start: '2026-09-04T10:30:00.000Z',
  }

  it.each([
    {
      expected: {end: '2026-09-30T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'},
      text: '이번 달 일정 알려줘',
    },
    {
      expected: {end: '2026-09-30T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'},
      text: '이번달 일정 알려줘',
    },
    {
      expected: {end: '2026-10-31T15:00:00.000Z', start: '2026-09-30T15:00:00.000Z'},
      text: '다음 달 일정 알려줘',
    },
    {
      expected: {end: '2026-10-31T15:00:00.000Z', start: '2026-09-30T15:00:00.000Z'},
      text: '다음달 일정 알려줘',
    },
    {
      expected: {end: '2026-08-31T15:00:00.000Z', start: '2026-07-31T15:00:00.000Z'},
      text: '지난 달 일정 알려줘',
    },
  ])('should query the local calendar month for "$text"', ({expected, text}) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).not.toEqual(defaultWindow)
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })
})

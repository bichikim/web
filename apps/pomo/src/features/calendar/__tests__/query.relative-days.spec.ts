import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery relative days', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  it('should query two days ago for the 그제 synonym', () => {
    expect(createCalendarQuery({now, text: '그제 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-02T15:00:00.000Z',
      start: '2026-09-01T15:00:00.000Z',
    })
  })

  it('should recognize 그제 in an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '그제 뭐 있었어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-02T15:00:00.000Z',
      start: '2026-09-01T15:00:00.000Z',
    })
  })

  it.each([
    {
      expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
      text: '그제 말고 글피 일정 알려줘',
    },
    {
      expected: {end: '2026-09-02T15:00:00.000Z', start: '2026-09-01T15:00:00.000Z'},
      text: '글피 말고 그제 일정 알려줘',
    },
    {
      expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
      text: '글피 그제 말고 일정 알려줘',
    },
  ])('should query the included relative day in "$text"', ({expected, text}) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })
})

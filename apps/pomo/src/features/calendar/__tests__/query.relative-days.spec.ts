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

  it.each(['재그제작 일정 알려줘', '어제품 일정 알려줘'])(
    'should keep the default calendar window for a relative-day substring inside "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
        end: '2026-10-04T10:30:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      })
    },
  )

  it('should not read an embedded relative day as an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '백어제는 뭐 있어?', timeZone: 'Asia/Seoul'})).toBeNull()
  })

  it.each([
    ['어제는 일정 알려줘', '2026-09-03T15:00:00.000Z', '2026-09-02T15:00:00.000Z'],
    ['어제의 일정 알려줘', '2026-09-03T15:00:00.000Z', '2026-09-02T15:00:00.000Z'],
    ['그제부터 일정 알려줘', '2026-09-02T15:00:00.000Z', '2026-09-01T15:00:00.000Z'],
    ['엊그제도 일정 알려줘', '2026-09-02T15:00:00.000Z', '2026-09-01T15:00:00.000Z'],
  ])('should recognize a relative day followed by a particle in "%s"', (text, end, start) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({end, start})
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

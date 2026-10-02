import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU implicit schedule without space before 뭐', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should recognize spaced implicit schedule questions as a baseline', () => {
    expect(createCalendarQuery({now, text: '글피 뭐 있어?', timeZone})).toEqual({
      end: '2026-09-07T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
    })
    expect(createCalendarQuery({now, text: '모레 뭐 있어?', timeZone})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-05T15:00:00.000Z',
    })
    expect(createCalendarQuery({now, text: '내일 뭐 있어?', timeZone})).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
  })

  it.each([
    [
      '글피뭐 있어?',
      {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    ],
    [
      '모레뭐 있어?',
      {end: '2026-09-06T15:00:00.000Z', start: '2026-09-05T15:00:00.000Z'},
    ],
    [
      '내일뭐 있어?',
      {end: '2026-09-05T15:00:00.000Z', start: '2026-09-04T15:00:00.000Z'},
    ],
  ])('should recognize relative day in "%s" without a space before 뭐', (text, expected) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual(expected)
  })
})

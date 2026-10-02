import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU relative day with 나/이나 particle', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  const expectSingleLocalDay = (text: string) => {
    const result = createCalendarQuery({now, text, timeZone})
    expect(result).not.toBeNull()
    const range = result as {end: string; start: string}
    const dayMilliseconds = 24 * 60 * 60 * 1000
    const spanMilliseconds = new Date(range.end).getTime() - new Date(range.start).getTime()
    expect(spanMilliseconds).toBeLessThanOrEqual(dayMilliseconds + 1)
  }

  it('should query one local day when the topic particle is attached', () => {
    expectSingleLocalDay('내일은 일정')
  })

  it.each([
    '내일나 일정',
    '내일이나 일정',
    '글피나 일정',
    '그저께나 일정',
    '모레나 일정',
  ])('should query one local day for "%s" like the topic-particle form', (text) => {
    expectSingleLocalDay(text)
  })
})

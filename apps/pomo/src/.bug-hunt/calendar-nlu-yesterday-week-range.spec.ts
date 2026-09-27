/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('createCalendarQuery yesterday with week ranges', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should include this week when yesterday is mentioned together', () => {
    expect(createCalendarQuery({now, text: '어제 이번 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })

  it('should include next week when yesterday is mentioned together', () => {
    expect(createCalendarQuery({now, text: '어제 다음 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })
})

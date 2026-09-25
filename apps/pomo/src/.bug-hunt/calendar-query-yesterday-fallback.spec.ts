/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('createCalendarQuery yesterday (bug hunt)', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should query yesterday local calendar day instead of the 30-day fallback window', () => {
    const query = createCalendarQuery({now, text: '어제 일정 알려줘', timeZone})

    expect(query).toEqual({
      end: '2026-09-03T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })
})

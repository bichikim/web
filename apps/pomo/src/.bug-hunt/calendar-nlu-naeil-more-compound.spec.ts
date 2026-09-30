/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 내일모레 compound', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'
  const moreDay = {
    end: '2026-09-06T15:00:00.000Z',
    start: '2026-09-05T15:00:00.000Z',
  }

  it('should query 모레 as a single local day', () => {
    expect(createCalendarQuery({now, text: '모레 일정 알려줘', timeZone})).toEqual(moreDay)
  })

  it('should not treat 내일모레 as both 내일 and 모레 offsets', () => {
    expect(createCalendarQuery({now, text: '내일모레 일정 알려줘', timeZone})).toEqual(moreDay)
  })
})

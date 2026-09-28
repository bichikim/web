/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

const MILLISECONDS_PER_DAY = 86_400_000
const NEXT_EVENT_WINDOW_DAYS = 30

it('should bound 주말 일정 to the upcoming weekend instead of the 30-day fallback', () => {
  const timeZone = 'Asia/Seoul'
  const now = new Date('2026-03-02T10:00:00+09:00')

  const range = createCalendarQuery({now, text: '주말 일정 알려줘', timeZone})

  expect(range).toEqual({
    end: '2026-03-08T15:00:00.000Z',
    start: '2026-03-06T15:00:00.000Z',
  })
  expect(range).not.toEqual({
    end: new Date(now.getTime() + NEXT_EVENT_WINDOW_DAYS * MILLISECONDS_PER_DAY).toISOString(),
    start: now.toISOString(),
  })
})

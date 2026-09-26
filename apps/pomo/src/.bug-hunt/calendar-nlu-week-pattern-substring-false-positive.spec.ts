/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it('should not treat the stock-market phrase as next-week calendar intent', () => {
  const nextWeekRange = createCalendarQuery({now, text: '다음 주 일정 알려줘', timeZone})
  const stockMeetingRange = createCalendarQuery({
    now,
    text: '다음 주식 회의 일정 알려줘',
    timeZone,
  })

  expect(stockMeetingRange).not.toEqual(nextWeekRange)
  expect(stockMeetingRange).toBeNull()
})

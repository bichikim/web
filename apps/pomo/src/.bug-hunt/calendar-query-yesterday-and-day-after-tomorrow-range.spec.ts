import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('createCalendarQuery yesterday with day after tomorrow', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should include yesterday when querying yesterday and day after tomorrow', () => {
    expect(createCalendarQuery({now, text: '어제 모레 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })

  it('should include yesterday when tomorrow is also in the utterance', () => {
    expect(createCalendarQuery({now, text: '어제 내일 모레 일정', timeZone})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })

  it('should include yesterday when today is also in the utterance', () => {
    expect(createCalendarQuery({now, text: '어제 오늘 모레 일정', timeZone})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })
})

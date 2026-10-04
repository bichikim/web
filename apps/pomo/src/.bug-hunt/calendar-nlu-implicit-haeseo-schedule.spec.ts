import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU implicit 했어 questions', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should query today when asking 오늘 뭐 했어?', () => {
    expect(createCalendarQuery({now, text: '오늘 뭐 했어?', timeZone})).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should query yesterday when asking 어제 뭐 했어?', () => {
    expect(createCalendarQuery({now, text: '어제 뭐 했어?', timeZone})).toEqual({
      end: '2026-09-03T15:00:00.000Z',
      start: '2026-09-02T15:00:00.000Z',
    })
  })
})

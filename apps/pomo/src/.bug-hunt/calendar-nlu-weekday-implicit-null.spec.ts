import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for an implicit weekday schedule question', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it('should resolve the next local Wednesday for an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '수요일 뭐 있어?', timeZone})).toEqual({
      end: '2026-09-09T15:00:00.000Z',
      start: '2026-09-08T15:00:00.000Z',
    })
  })
})

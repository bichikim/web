import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it('should query the local day before yesterday when the user asks about 그저께 with calendar intent', () => {
  expect(createCalendarQuery({now, text: '그저께 일정 알려줘', timeZone})).toEqual({
    end: '2026-09-02T15:00:00.000Z',
    start: '2026-09-01T15:00:00.000Z',
  })
})

it('should recognize an implicit schedule question about 그저께', () => {
  expect(createCalendarQuery({now, text: '그저께 뭐 있었어?', timeZone})).toEqual({
    end: '2026-09-02T15:00:00.000Z',
    start: '2026-09-01T15:00:00.000Z',
  })
})

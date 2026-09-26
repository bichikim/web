import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it('should query 글피 as the third day after today when calendar intent is present', () => {
  expect(createCalendarQuery({now, text: '글피 일정 알려줘', timeZone})).toEqual({
    end: '2026-09-07T15:00:00.000Z',
    start: '2026-09-06T15:00:00.000Z',
  })
})

it('should recognize an implicit schedule question about 글피', () => {
  expect(createCalendarQuery({now, text: '글피 뭐 있어?', timeZone})).toEqual({
    end: '2026-09-07T15:00:00.000Z',
    start: '2026-09-06T15:00:00.000Z',
  })
})

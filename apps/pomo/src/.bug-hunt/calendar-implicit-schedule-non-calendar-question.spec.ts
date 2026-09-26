/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it('should not treat a weather question as an implicit schedule query', () => {
  expect(createCalendarQuery({now, text: '오늘 날씨 뭐 있어?', timeZone})).toBeNull()
})

it('should still resolve an implicit schedule question about tomorrow', () => {
  expect(createCalendarQuery({now, text: '모레 뭐 있어?', timeZone})).toEqual({
    end: '2026-09-06T15:00:00.000Z',
    start: '2026-09-05T15:00:00.000Z',
  })
})

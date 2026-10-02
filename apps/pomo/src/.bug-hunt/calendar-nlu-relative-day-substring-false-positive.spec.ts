import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU relative-day substring false positives', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it.each([
    {text: '재그제작 일정 알려줘', label: '그제 inside 재그제작'},
    {text: '어제품 일정 알려줘', label: '어제 inside 어제품'},
  ])('should not narrow to a relative day when $label', ({text}) => {
    expect(createCalendarQuery({now, text, timeZone})).toBeNull()
  })
})

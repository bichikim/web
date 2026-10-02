import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU when a period or relative day is glued to an intent word', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it.each([
    {glued: '오늘일정 알려줘', spaced: '오늘 일정 알려줘'},
    {glued: '내일일정 알려줘', spaced: '내일 일정 알려줘'},
    {glued: '오늘미팅 알려줘', spaced: '오늘 미팅 알려줘'},
    {glued: '이번달일정 알려줘', spaced: '이번달 일정 알려줘'},
    {glued: '이번주일정 알려줘', spaced: '이번 주 일정 알려줘'},
  ])('should match spaced form for "$glued"', ({glued, spaced}) => {
    const spacedQuery = createCalendarQuery({now, text: spaced, timeZone})
    const gluedQuery = createCalendarQuery({now, text: glued, timeZone})

    expect(spacedQuery).not.toBeNull()
    expect(gluedQuery).toEqual(spacedQuery)
  })
})

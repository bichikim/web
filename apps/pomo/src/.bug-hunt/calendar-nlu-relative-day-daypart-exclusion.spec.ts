import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU when a daypart is excluded after a relative day', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'
  const defaultWindow = {
    end: '2026-10-04T10:30:00.000Z',
    start: '2026-09-04T10:30:00.000Z',
  }

  it('should keep tomorrow when only the morning daypart is excluded', () => {
    const tomorrow = createCalendarQuery({now, text: '내일 일정 알려줘', timeZone})
    const query = createCalendarQuery({now, text: '내일 오전 말고 일정 알려줘', timeZone})

    expect(tomorrow).not.toEqual(defaultWindow)
    expect(query).toEqual(tomorrow)
  })

  it('should query tomorrow morning when afternoon is excluded', () => {
    const tomorrowMorning = createCalendarQuery({now, text: '내일 오전 일정 알려줘', timeZone})
    const query = createCalendarQuery({now, text: '내일 오후 말고 오전 일정 알려줘', timeZone})

    expect(tomorrowMorning).not.toEqual(defaultWindow)
    expect(query).toEqual(tomorrowMorning)
  })
})

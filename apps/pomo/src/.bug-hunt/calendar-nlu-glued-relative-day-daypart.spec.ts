import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

describe('createCalendarQuery glued relative day + daypart (bug)', () => {
  it('should use tomorrow morning window when 오전 is glued to 내일 in an explicit schedule query', () => {
    const spaced = createCalendarQuery({
      now,
      text: '내일 오전 일정 알려줘',
      timeZone,
    })
    const glued = createCalendarQuery({
      now,
      text: '내일오전 일정 알려줘',
      timeZone,
    })

    expect(spaced).toEqual({
      end: '2026-09-05T03:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
    expect(glued).toEqual(spaced)
  })

  it('should use today afternoon window when 오후 is glued to 오늘 in an explicit schedule query', () => {
    const spaced = createCalendarQuery({
      now,
      text: '오늘 오후 일정 알려줘',
      timeZone,
    })
    const glued = createCalendarQuery({
      now,
      text: '오늘오후 일정 알려줘',
      timeZone,
    })

    expect(spaced).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
    expect(glued).toEqual(spaced)
  })

  it('should use tomorrow night daypart window when 밤 is glued to 내일', () => {
    const spaced = createCalendarQuery({
      now,
      text: '내일 밤 일정 알려줘',
      timeZone,
    })
    const glued = createCalendarQuery({
      now,
      text: '내일밤 일정 알려줘',
      timeZone,
    })

    expect(spaced).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-05T12:00:00.000Z',
    })
    expect(glued).toEqual(spaced)
  })

  it('should resolve implicit schedule questions when evening daypart is glued to 오늘', () => {
    const spaced = createCalendarQuery({
      now,
      text: '오늘 저녁 뭐 있어?',
      timeZone,
    })
    const glued = createCalendarQuery({
      now,
      text: '오늘저녁 뭐 있어?',
      timeZone,
    })

    expect(spaced).toEqual({
      end: '2026-09-04T12:00:00.000Z',
      start: '2026-09-04T09:00:00.000Z',
    })
    expect(glued).toEqual(spaced)
  })
})

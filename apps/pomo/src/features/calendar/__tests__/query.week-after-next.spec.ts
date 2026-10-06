import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery for the week after next', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'

  it.each(['다다음 주 일정 알려줘', '다다음주 일정 알려줘', '다다음 주 뭐 있어?'])(
    'should query the week after next for "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone})).toEqual({
        end: '2026-09-20T15:00:00.000Z',
        start: '2026-09-13T15:00:00.000Z',
      })
    },
  )

  it('should query next week when the week after next is excluded', () => {
    expect(
      createCalendarQuery({now, text: '다다음 주 말고 다음 주 일정 알려줘', timeZone}),
    ).toEqual({
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
    })
  })

  it('should include next week when the week after next is also requested', () => {
    expect(createCalendarQuery({now, text: '다음 주 다다음 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
    })
  })

  it('should include today through the week after next when both are requested', () => {
    expect(createCalendarQuery({now, text: '오늘 다다음 주 일정 알려줘', timeZone})).toEqual({
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })
})

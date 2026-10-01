/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../features/calendar/query'

describe('calendar NLU for 저번 달', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')
  const timeZone = 'Asia/Seoul'
  const defaultWindow = {
    end: '2026-10-04T10:30:00.000Z',
    start: '2026-09-04T10:30:00.000Z',
  }
  const lastMonth = {
    end: '2026-08-31T15:00:00.000Z',
    start: '2026-07-31T15:00:00.000Z',
  }

  it.each(['저번 달 일정 알려줘', '저번달 일정 알려줘'])(
    'should query the previous local month for "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone})).not.toEqual(defaultWindow)
      expect(createCalendarQuery({now, text, timeZone})).toEqual(lastMonth)
    },
  )

  it('should treat 저번 달 like 지난 달 for the same question', () => {
    const withJinan = createCalendarQuery({now, text: '지난 달 일정 알려줘', timeZone})
    const withJeobeon = createCalendarQuery({now, text: '저번 달 일정 알려줘', timeZone})

    expect(withJeobeon).toEqual(withJinan)
    expect(withJeobeon).toEqual(lastMonth)
  })
})

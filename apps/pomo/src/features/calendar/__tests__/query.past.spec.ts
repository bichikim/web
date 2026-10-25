import {expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it.each([
  ['어제', '했어?'],
  ['어제', '했어요?'],
  ['오늘', '했어?'],
  ['오늘', '했어요?'],
])('should preserve the existing range for %s 뭐 %s', (period, verb) => {
  expect(createCalendarQuery({now, text: `${period} 뭐 ${verb}`, timeZone})).toEqual(
    createCalendarQuery({now, text: `${period} 뭐 있었어?`, timeZone}),
  )
})

it.each(['오늘 뉴스 뭐 했어?', '어제 날씨 뭐 했어요?', '뭐 했어?', '오늘 뭐 뉴스 했어?'])(
  'should ignore a past-tense question without calendar context in %s',
  (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toBeNull()
  },
)

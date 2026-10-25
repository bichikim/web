import {expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it.each(['말고', '빼고', '제외하고', '아닌'])(
  'should select tomorrow afternoon after excluding morning with %s',
  (exclusion) => {
    expect(
      createCalendarQuery({now, text: `오전 ${exclusion} 오후 내일 일정 알려줘`, timeZone}),
    ).toEqual({end: '2026-09-05T15:00:00.000Z', start: '2026-09-05T03:00:00.000Z'})
  },
)

it.each(['금요일 오전 말고 오후 일정 알려줘', '오전 말고 오후 오늘 일정 알려줘'])(
  'should retain current afternoon clipping for %s',
  (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-09-04T15:00:00.000Z',
      start: now.toISOString(),
    })
  },
)

it.each([
  ['오후 말고 오전 내일 일정 알려줘', '내일 오전 일정 알려줘'],
  ['오전 오후 내일 일정 알려줘', '내일 오전 일정 알려줘'],
  ['오전 말고 내일 일정 알려줘', '내일 오전 일정 알려줘'],
  ['오전 말고 오후 말고 내일 일정 알려줘', '내일 오전 일정 알려줘'],
  ['점심 말고 저녁 내일 일정 알려줘', '내일 저녁 일정 알려줘'],
])('should preserve the existing selection in %s', (text, control) => {
  expect(createCalendarQuery({now, text, timeZone})).toEqual(
    createCalendarQuery({now, text: control, timeZone}),
  )
})

import {expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'

it.each([
  ['내일 오전 말고 오후 일정 알려줘', '내일 오후 일정 알려줘'],
  ['내일 오전 말고 저녁 일정 알려줘', '내일 저녁 일정 알려줘'],
  ['내일 오후 말고 오전 일정 알려줘', '내일 오전 일정 알려줘'],
  ['내일 점심 말고 저녁 일정 알려줘', '내일 저녁 일정 알려줘'],
  ['오전 말고 저녁 내일 일정 알려줘', '내일 저녁 일정 알려줘'],
  ['오늘 오전 말고 오후 일정 알려줘', '오늘 오후 일정 알려줘'],
])('should preserve the date and explicit replacement in %s', (text, control) => {
  expect(createCalendarQuery({now, text, timeZone})).toEqual(
    createCalendarQuery({now, text: control, timeZone}),
  )
})

it.each([
  ['오전 오후 내일 일정 알려줘', '내일 오전 일정 알려줘'],
  ['오전 말고 오후 말고 내일 일정 알려줘', '내일 오전 일정 알려줘'],
  ['오전 말고 내일 일정 알려줘', '내일 오전 일정 알려줘'],
  ['내일 오전 말고 일정 알려줘', '일정 알려줘'],
  ['내일 말고 모레 일정 알려줘', '모레 일정 알려줘'],
])(
  'should preserve the existing behavior without a positive replacement in %s',
  (text, control) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual(
      createCalendarQuery({now, text: control, timeZone}),
    )
  },
)

it.each([
  ['내일 오전 말고 모레 오후 일정 알려줘', '모레 오후 일정 알려줘'],
  ['내일오전말고오후와모레오전 일정 알려줘', '일정 알려줘'],
  ['오전말고오후말고저녁내일 일정 알려줘', '일정 알려줘'],
  ['내일 오전 저녁 일정 알려줘', '내일 오전 일정 알려줘'],
  ['내일 이른오전말고오후 일정 알려줘', '일정 알려줘'],
  ['내일 오전말고오후반차 일정 알려줘', '일정 알려줘'],
])('should preserve existing date scopes and word boundaries in %s', (text, control) => {
  expect(createCalendarQuery({now, text, timeZone})).toEqual(
    createCalendarQuery({now, text: control, timeZone}),
  )
})

it.each([
  ['오전말고오후말고저녁 내일 일정 알려줘', '내일 저녁 일정 알려줘'],
  ['내일 오전 말고 정오 일정 알려줘', '내일 정오 일정 알려줘'],
  ['내일 오후 말고 밤 일정 알려줘', '내일 밤 일정 알려줘'],
  ['내일 오전 빼고 오후 일정 알려줘', '내일 오후 일정 알려줘'],
  ['내일 오전 말고 오후에 일정 알려줘', '내일 오후 일정 알려줘'],
])('should use the existing named replacement window in %s', (text, control) => {
  expect(createCalendarQuery({now, text, timeZone})).toEqual(
    createCalendarQuery({now, text: control, timeZone}),
  )
})

it.each(['2026-09-04T13:00:00.000Z', '2026-09-04T17:30:00.000Z'])(
  'should preserve the existing local afternoon clipping at %s',
  (instant) => {
    const options = {now: new Date(instant), timeZone: 'America/New_York'}
    expect(createCalendarQuery({...options, text: '오늘 오전 말고 오후 일정 알려줘'})).toEqual(
      createCalendarQuery({...options, text: '오늘 오후 일정 알려줘'}),
    )
  },
)

it('should retain the original intent check before omitting an excluded time', () => {
  expect(createCalendarQuery({now, text: '내일 오전 말고 저녁 뭐 있어?', timeZone})).toBeNull()
})

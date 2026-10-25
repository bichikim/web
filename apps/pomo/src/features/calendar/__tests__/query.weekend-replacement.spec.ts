/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createCalendarQuery} from '../query'
const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone: 'Asia/Seoul'}
it.each([
  ['다음 주말 말고 주말 일정 알려줘', '주말 일정 알려줘'],
  ['다음 주말은 말고 주말 일정 알려줘', '주말 일정 알려줘'],
  ['다음주말말고주말일정 알려줘', '주말 일정 알려줘'],
  ['주말 다음 주말 말고 일정 알려줘', '주말 일정 알려줘'],
  ['다다음 주말 말고 다음 주말 일정 알려줘', '다음 주말 일정 알려줘'],
  ['다다음주말말고다음주말일정 알려줘', '다음 주말 일정 알려줘'],
  ['다음 주말 다다음 주말 말고 일정 알려줘', '다음 주말 일정 알려줘'],
])('should select the explicit remaining weekend in %s', (text, canonical) => {
  expect(createCalendarQuery({...options, text})).toEqual(
    createCalendarQuery({...options, text: canonical}),
  )
})
it.each([
  '다다음 주말 말고 다음 주말도 말고 일정 알려줘',
  '다다음 주말 말고 다음 주말에는 말고 일정 알려줘',
  '다다음 주말 말고 다음 주말이 아닌 일정 알려줘',
  '다다음 주말 말고 다음 주말도 빼고 일정 알려줘',
  '다다음 주말 말고 다음 주말만 제외하고 일정 알려줘',
  '다다음 주말 말고 다음 주말은 안 돼 일정 알려줘',
  '다다음 주말 말고 일정 알려줘',
  '다다음 주말 말고 다음 주말 말고 일정 알려줘',
  '주말 말고 주말 일정 알려줘',
  '지난 주말 말고 다음 주말 주말 일정 알려줘',
  '주말 말고 다음 주말 일정 알려줘',
  '다다음 주말 말고 다음 주말 주말 일정 알려줘',
])('should preserve the fallback for the separate ambiguous or excluded input %s', (text) => {
  expect(createCalendarQuery({...options, text})).toEqual({
    end: '2026-10-04T10:30:00.000Z',
    start: options.now.toISOString(),
  })
})

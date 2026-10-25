/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createCalendarQuery} from '../query'
const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone: 'Asia/Seoul'}
it.each([
  ['이번 주 월요일 오전 말고 화요일 오후 일정 알려줘', '이번 주 화요일 오후 일정 알려줘'],
  ['다음 주 월요일 3시 말고 화요일 오후 일정 알려줘', '다음 주 화요일 오후 일정 알려줘'],
  ['다음 주 월요일 15:00 말고 화요일 오후 일정 알려줘', '다음 주 화요일 오후 일정 알려줘'],
])('should retain the canonical selected weekday in %s', (text, canonical) => {
  expect(createCalendarQuery({...options, text})).toEqual(
    createCalendarQuery({...options, text: canonical}),
  )
})
it.each([
  {
    expected: {end: '2026-09-01T15:00:00.000Z', start: '2026-09-01T03:00:00.000Z'},
    text: '이번 주 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'},
    text: '다음 주 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-01T15:00:00.000Z', start: '2026-09-01T03:00:00.000Z'},
    text: '이번 주 월요일 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'},
    text: '다음 주 월요일 오전 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    text: '이번 주 월요일 오전 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    text: '이번 주 월요일 오전 말고 화요일 오후 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    text: '이번 주 월요일 오전 말고 월요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 말고 화요일 오후 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 25시 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 일정 알려줘',
  },
  {
    expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 15:00 일정 알려줘',
  },
  {
    expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 일정 알려줘',
  },
  {expected: null, text: '다음 주 월요일에 관한 글 써줘'},
])('should preserve existing control $text', ({text, expected}) => {
  expect(createCalendarQuery({...options, text})).toEqual(expected)
})

it.each([
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 말고 화요일 오후만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 말고 화요일 오후 일정도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    text: '이번 주 월요일 오전 말고 화요일 오후만 말고 일정 알려줘',
  },
])('should preserve baseline for a negated timed replacement $text', ({expected, text}) => {
  expect(createCalendarQuery({...options, text})).toEqual(expected)
})

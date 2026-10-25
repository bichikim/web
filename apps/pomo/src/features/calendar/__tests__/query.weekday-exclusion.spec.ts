import {expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

const timeZone = 'Asia/Seoul'
const dates = ['2026-09-03T10:30:00.000Z', '2026-09-04T10:30:00.000Z']
const tuesday = {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'}
const replacements = [
  '다음 주 월요일 오전 말고 화요일 오후 일정 알려줘',
  '다음주 월요일 오전 말고 화요일 오후 일정 알려줘',
  '다음 주 월요일 오후 말고 화요일 오전 일정 알려줘',
  '다음 주 월요일 저녁 말고 화요일 오후 일정 알려줘',
]

it.each(dates.flatMap((now) => replacements.map((text) => ({now, text}))))(
  'should exclude the weekday rather than widening the canonical replacement at $now in $text',
  ({now, text}) => {
    const options = {now: new Date(now), timeZone}
    const control = createCalendarQuery({...options, text: '다음 주 화요일 오후 일정 알려줘'})
    expect(control).toEqual(tuesday)
    expect(createCalendarQuery({...options, text})).toEqual(control)
  },
)

it.each(dates)('should retain the existing whole-Tuesday canonical range at %s', (now) => {
  expect(
    createCalendarQuery({now: new Date(now), text: '다음 주 화요일 오후 일정 알려줘', timeZone}),
  ).toEqual(tuesday)
})

it.each(dates)('should preserve weekday exclusion without a time word at %s', (now) => {
  expect(
    createCalendarQuery({
      now: new Date(now),
      text: '다음 주 월요일 말고 화요일 오후 일정 알려줘',
      timeZone,
    }),
  ).toEqual(tuesday)
})

it.each(dates)('should preserve two positive weekdays with time words at %s', (now) => {
  const options = {now: new Date(now), timeZone}
  expect(
    createCalendarQuery({...options, text: '다음 주 월요일 오전 화요일 오후 일정 알려줘'}),
  ).toEqual(createCalendarQuery({...options, text: '다음 주 월요일 화요일 일정 알려줘'}))
})

it.each(dates)('should preserve an adjacent time-only replacement at %s', (now) => {
  const options = {now: new Date(now), timeZone}
  expect(
    createCalendarQuery({...options, text: '다음 주 월요일 오전 말고 오후 일정 알려줘'}),
  ).toEqual(createCalendarQuery({...options, text: '다음 주 월요일 오후 일정 알려줘'}))
})

it.each(dates)('should preserve a relative-date replacement between time words at %s', (now) => {
  const options = {now: new Date(now), timeZone}
  expect(createCalendarQuery({...options, text: '내일 오전 말고 모레 오후 일정 알려줘'})).toEqual(
    createCalendarQuery({...options, text: '모레 오후 일정 알려줘'}),
  )
})

it('should retain the canonical replacement across a year boundary', () => {
  const options = {now: new Date('2026-12-31T10:30:00.000Z'), timeZone}
  const control = createCalendarQuery({...options, text: '다음 주 화요일 오후 일정 알려줘'})
  expect(control).toEqual({end: '2027-01-05T15:00:00.000Z', start: '2027-01-04T15:00:00.000Z'})
  expect(
    createCalendarQuery({...options, text: '다음 주 월요일 오전 말고 화요일 오후 일정 알려줘'}),
  ).toEqual(control)
})

it('should preserve another explicit replacement weekday without changing its canonical time range', () => {
  const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone}
  const control = createCalendarQuery({...options, text: '다음 주 금요일 오후 일정 알려줘'})
  expect(control).toEqual({end: '2026-09-11T15:00:00.000Z', start: '2026-09-10T15:00:00.000Z'})
  expect(
    createCalendarQuery({...options, text: '다음 주 수요일 오전 말고 금요일 오후 일정 알려줘'}),
  ).toEqual(control)
})

it('should retain the original calendar-intent requirement', () => {
  expect(
    createCalendarQuery({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '다음 주 월요일 오전 말고 화요일 오후 날씨 알려줘',
      timeZone,
    }),
  ).toBeNull()
})

/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createCalendarQuery} from '../query'
const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone: 'Asia/Seoul'}
it.each([
  {
    canonical: '다음 주 화요일 오후 일정 알려줘',
    text: '다음 주 월요일 3시반 말고 화요일 오후 일정 알려줘',
  },
  {
    canonical: '다음 주 화요일 오후 일정 알려줘',
    text: '다음 주 월요일 9시반 말고 화요일 오후 일정 알려줘',
  },
  {
    canonical: '다음 주 화요일 오후 일정 알려줘',
    text: '다음 주 월요일 0시 반 말고 화요일 오후 일정 알려줘',
  },
  {
    canonical: '다음 주 화요일 오후 일정 알려줘',
    text: '다음 주 월요일 23시 반 말고 화요일 오후 일정 알려줘',
  },
  {
    canonical: '이번 주 화요일 오후 일정 알려줘',
    text: '이번 주 월요일 3시반 말고 화요일 오후 일정 알려줘',
  },
  {
    canonical: '이번 주 화요일 오후 일정 알려줘',
    text: '이번 주 월요일 3시 반 말고 화요일 오후 일정 알려줘',
  },
  {
    canonical: '다음 주 화요일 오후 일정 알려줘',
    text: '다음 주 월요일 3시 반 말고 화요일 오후 일정 알려줘',
  },
  {
    canonical: '다음 주 화요일 오후 일정 알려줘',
    text: '다음 주 월요일 9시 반 말고 화요일 오후 일정 알려줘',
  },
])(
  'should match the explicit replacement weekday after excluding half-hour time in $text',
  ({canonical, text}) => {
    expect(createCalendarQuery({...options, text})).toEqual(
      createCalendarQuery({...options, text: canonical}),
    )
  },
)
it.each([
  {
    expected: {end: '2026-09-01T15:00:00.000Z', start: '2026-09-01T03:00:00.000Z'},
    text: '이번 주 월요일 3시 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'},
    text: '다음 주 월요일 3시 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'},
    text: '다음 주 월요일 9시 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-01T15:00:00.000Z', start: '2026-09-01T03:00:00.000Z'},
    text: '이번 주 월요일 15:00 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'},
    text: '다음 주 월요일 15:00 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-01T15:00:00.000Z', start: '2026-09-01T03:00:00.000Z'},
    text: '이번 주 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-07T15:00:00.000Z'},
    text: '다음 주 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 반 말고 화요일 오후만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    text: '이번 주 월요일 3시 반 말고 화요일 오후 일정도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 반 말고 화요일 오후 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 반 말고 월요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 화요일 오후 말고 월요일 3시 반 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 반대 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 반 반 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 24시 반 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 25시 반 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 15:00 반 말고 화요일 오후 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 30분 말고 화요일 오후 일정 알려줘',
  },
  {expected: null, text: '다음 주 월요일 3시 반에 관한 글 써줘'},
])('should preserve the existing clock or separate control for $text', ({expected, text}) => {
  expect(createCalendarQuery({...options, text})).toEqual(expected)
})

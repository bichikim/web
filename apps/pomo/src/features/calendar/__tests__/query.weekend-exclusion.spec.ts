import {expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

const timeZone = 'Asia/Seoul'
const days = [
  {day: 'Thursday', now: '2026-09-03T10:30:00.000Z', start: '2026-09-04T15:00:00.000Z'},
  {day: 'Friday', now: '2026-09-04T10:30:00.000Z', start: '2026-09-04T15:00:00.000Z'},
  {day: 'Saturday', now: '2026-09-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
  {day: 'Sunday', now: '2026-09-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
]
const replacements = ['지난 주말', '다다음 주말'].flatMap((qualified) => [
  `${qualified} 말고 주말 일정 알려줘`,
  `주말 ${qualified} 말고 일정 알려줘`,
])

it.each(days.flatMap((day) => replacements.map((text) => ({...day, text}))))(
  'should retain the unexcluded upcoming weekend on $day in $text',
  ({now, start, text}) => {
    expect(createCalendarQuery({now: new Date(now), text, timeZone})).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      start,
    })
  },
)

it.each([
  '다다음주말말고주말일정 알려줘',
  '지난주말말고주말일정 알려줘',
  '다다음 주말은 말고 주말 일정 알려줘',
])('should keep a distinct bare weekend after an excluded qualified phrase in %s', (text) => {
  expect(createCalendarQuery({now: new Date('2026-09-04T10:30:00.000Z'), text, timeZone})).toEqual({
    end: '2026-09-06T15:00:00.000Z',
    start: '2026-09-04T15:00:00.000Z',
  })
})

it.each(days)('should preserve the ordinary upcoming weekend on $day', ({now, start}) => {
  expect(createCalendarQuery({now: new Date(now), text: '주말 일정 알려줘', timeZone})).toEqual({
    end: '2026-09-06T15:00:00.000Z',
    start,
  })
})

it.each(
  days.flatMap((day) => [
    {
      ...day,
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-11T15:00:00.000Z',
      text: '다음 주말 일정 알려줘',
    },
    {
      ...day,
      end: '2026-08-30T15:00:00.000Z',
      start: '2026-08-28T15:00:00.000Z',
      text: '지난 주말 일정 알려줘',
    },
    {
      ...day,
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-18T15:00:00.000Z',
      text: '다다음 주말 일정 알려줘',
    },
    {
      ...day,
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-18T15:00:00.000Z',
      text: '주말 말고 다다음 주말 일정 알려줘',
    },
  ]),
)(
  'should preserve the existing qualified selection on $day in $text',
  ({end, now, start, text}) => {
    expect(createCalendarQuery({now: new Date(now), text, timeZone})).toEqual({end, start})
  },
)

it.each(
  days.flatMap((day) =>
    ['주말 말고 다음 주 일정 알려줘'].map((text) => ({
      ...day,
      text,
    })),
  ),
)(
  'should preserve an actual weekend exclusion with a week selection on $day in $text',
  ({now, text}) => {
    expect(createCalendarQuery({now: new Date(now), text, timeZone})).toEqual({
      end: '2026-09-13T15:00:00.000Z',
      start: '2026-09-06T15:00:00.000Z',
    })
  },
)

it.each(days)('should retain a real relative-date exclusion on $day', ({now}) => {
  const options = {now: new Date(now), timeZone}
  expect(createCalendarQuery({...options, text: '내일 말고 모레 일정 알려줘'})).toEqual(
    createCalendarQuery({...options, text: '모레 일정 알려줘'}),
  )
})

it.each(['다다음 주말 말고 주말 말고 일정 알려줘', '주말 말고 다음 주말 말고 일정 알려줘'])(
  'should preserve the existing fallback when no bare weekend is positively selected in %s',
  (text) => {
    expect(
      createCalendarQuery({now: new Date('2026-09-04T10:30:00.000Z'), text, timeZone}),
    ).toEqual({end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'})
  },
)

it.each([
  ['주말 지난 주말 일정 알려줘', '지난 주말 일정 알려줘'],
  ['주말 다음 주말 일정 알려줘', '다음 주말 일정 알려줘'],
  ['주말 다다음 주말 일정 알려줘', '다다음 주말 일정 알려줘'],
  ['다다음 주말 말고 지난 주말 주말 일정 알려줘', '일정 알려줘'],
  ['지난 주말 말고 다음 주말 주말 일정 알려줘', '일정 알려줘'],
  ['주말 말고 지난 주말 일정 알려줘', '일정 알려줘'],
  ['주말 말고 다음 주말 일정 알려줘', '일정 알려줘'],
])('should preserve the existing qualified priority and mixed fallback in %s', (text, control) => {
  const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone}
  expect(createCalendarQuery({...options, text})).toEqual(
    createCalendarQuery({...options, text: control}),
  )
})

it('should retain a bare selection after excluding two qualified weekend occurrences', () => {
  const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone}
  expect(
    createCalendarQuery({...options, text: '다다음주말말고지난주말말고주말일정 알려줘'}),
  ).toEqual(createCalendarQuery({...options, text: '주말 일정 알려줘'}))
})

it.each(['저번 주말 말고 주말 일정 알려줘', '주말 저번 주말 말고 일정 알려줘'])(
  'should retain an upcoming weekend after excluding the existing previous-weekend alias in %s',
  (text) => {
    const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone}
    expect(createCalendarQuery({...options, text})).toEqual(
      createCalendarQuery({...options, text: '주말 일정 알려줘'}),
    )
  },
)

it.each(
  [
    {now: '2026-10-30T12:00:00.000Z', start: '2026-10-31T04:00:00.000Z'},
    {now: '2026-11-01T06:30:00.000Z', start: '2026-11-01T06:30:00.000Z'},
  ].flatMap((sample) => ['지난 주말', '다다음 주말'].map((qualified) => ({...sample, qualified}))),
)(
  'should retain the canonical DST weekend and current-time clipping at $now after excluding $qualified',
  ({now, qualified, start}) => {
    const options = {now: new Date(now), timeZone: 'America/New_York'}
    const control = createCalendarQuery({...options, text: '주말 일정 알려줘'})
    expect(control).toEqual({end: '2026-11-02T05:00:00.000Z', start})
    expect(createCalendarQuery({...options, text: `${qualified} 말고 주말 일정 알려줘`})).toEqual(
      control,
    )
  },
)

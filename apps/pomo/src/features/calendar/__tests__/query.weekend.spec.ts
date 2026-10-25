import {expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'
const afterNext = {end: '2026-09-20T15:00:00.000Z', start: '2026-09-18T15:00:00.000Z'}

it.each([
  '다다음 주말 일정 알려줘',
  '다다음주말 일정 알려줘',
  '다다음 주말에는 뭐 있어?',
  '다음 주말 말고 다다음 주말 일정 알려줘',
  '다다음 주말 다음 주말 말고 일정 알려줘',
])('should query the weekend after next in %s', (text) => {
  expect(createCalendarQuery({now, text, timeZone})).toEqual(afterNext)
})

it('should preserve exclusion of a weekend when the weekend after next is excluded', () => {
  expect(
    createCalendarQuery({now, text: '다다음 주말 말고 다음 주말 일정 알려줘', timeZone}),
  ).toEqual({end: '2026-10-04T10:30:00.000Z', start: now.toISOString()})
})

it.each(['2026-09-05T10:30:00.000Z', '2026-09-06T10:30:00.000Z'])(
  'should retain the future Saturday boundary on %s',
  (current) => {
    expect(
      createCalendarQuery({now: new Date(current), text: '다다음 주말 일정 알려줘', timeZone}),
    ).toEqual(afterNext)
  },
)

it('should reparse each local boundary for a weekend crossing DST', () => {
  expect(
    createCalendarQuery({
      now: new Date('2026-10-16T12:00:00.000Z'),
      text: '다다음 주말 일정 알려줘',
      timeZone: 'America/New_York',
    }),
  ).toEqual({end: '2026-11-02T05:00:00.000Z', start: '2026-10-31T04:00:00.000Z'})
})

it('should keep the week-after-next control separate from its weekend', () => {
  expect(createCalendarQuery({now, text: '다다음 주 일정 알려줘', timeZone})).toEqual({
    end: afterNext.end,
    start: '2026-09-13T15:00:00.000Z',
  })
})

it.each(['지난 주말 말고 다음 주말 일정 알려줘', '다음 주말 말고 지난 주말 일정 알려줘'])(
  'should preserve the existing exclusion priority in %s',
  (text) => {
    expect(createCalendarQuery({now, text, timeZone})).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: now.toISOString(),
    })
  },
)

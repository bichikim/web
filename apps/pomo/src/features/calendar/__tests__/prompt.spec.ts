/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../prompt'
import type {CalendarEvent} from '../types'

const createEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  accountLabel: 'work@example.com',
  allDay: false,
  calendarLabel: '업무',
  end: '2026-09-05T01:00:00.000Z',
  id: 'event-1',
  provider: 'google',
  start: '2026-09-05T00:00:00.000Z',
  title: '주간 회의',
  ...overrides,
})

it('should describe normalized timed and all-day events without leaking provider payloads', () => {
  expect(
    createCalendarPromptContext({
      events: [
        {
          accountLabel: 'work@example.com',
          allDay: false,
          calendarLabel: '업무',
          end: '2026-09-05T01:00:00.000Z',
          id: 'event-1',
          provider: 'google',
          start: '2026-09-05T00:00:00.000Z',
          title: '주간 회의',
        },
        {
          accountLabel: '개인 계정',
          allDay: true,
          calendarLabel: 'Calendar',
          end: '2026-09-06',
          id: 'event-2',
          provider: 'microsoft',
          start: '2026-09-05',
          title: '휴가',
        },
      ],
      timeZone: 'Asia/Seoul',
    }),
  ).toBe(
    [
      '캘린더 조회 결과입니다. 이 정보에만 근거해 답하고, 일정이 없으면 없다고 말하세요.',
      '표시 시간대: Asia/Seoul',
      '- [Google · work@example.com · 업무] 2026. 9. 5. 오전 9:00–오전 10:00 · 주간 회의',
      '- [Microsoft · 개인 계정 · Calendar] 2026. 9. 5. 종일 · 휴가',
    ].join('\n'),
  )
})

it('should include the exclusive end date for a multi-day all-day event', () => {
  const context = createCalendarPromptContext({
    events: [
      createEvent({
        allDay: true,
        end: '2026-09-07',
        start: '2026-09-05',
        title: '연휴',
      }),
    ],
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('2026. 9. 5.–2026. 9. 7. (종일, 종료일 미포함)')
})

it('should explicitly represent an empty result', () => {
  expect(createCalendarPromptContext({events: [], timeZone: 'Asia/Seoul'})).toContain(
    '조회 기간에 등록된 일정이 없습니다.',
  )
})

it('should omit events with invalid times and mark the context incomplete', () => {
  const context = createCalendarPromptContext({
    events: [
      createEvent({start: 'not-a-date', title: '잘못된 시작 시각'}),
      createEvent({end: 'not-a-date', title: '잘못된 종료 시각'}),
      createEvent({start: '2026-02-30T00:00:00.000Z', title: '불가능한 시각 날짜'}),
      createEvent({
        allDay: true,
        end: '2026-09-06',
        start: '2026-13-45',
        title: '잘못된 시작 날짜',
      }),
      createEvent({
        allDay: true,
        end: '2026-13-45',
        start: '2026-09-05',
        title: '잘못된 종료 날짜',
      }),
      createEvent({title: '정상 일정'}),
    ],
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('일부 일정만 확인했습니다.')
  expect(context).toContain('정상 일정')
  expect(context).not.toContain('잘못된')
  expect(context).not.toContain('불가능한 시각 날짜')
  expect(context).not.toContain('Invalid Date')
  expect(context).not.toContain('2026. 13. 45.')
})

it('should keep an incomplete empty result when all events have invalid times', () => {
  const context = createCalendarPromptContext({
    events: [createEvent({start: 'not-a-date'})],
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('일부 일정만 확인했습니다.')
  expect(context).toContain('확인된 일정이 없습니다.')
  expect(context).not.toContain('조회 기간에 등록된 일정이 없습니다.')
})

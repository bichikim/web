import {expect, it} from 'vitest'

import {createCalendarPromptContext} from '../prompt'

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

it('should explicitly represent an empty result', () => {
  expect(createCalendarPromptContext({events: [], timeZone: 'Asia/Seoul'})).toContain(
    '조회 기간에 등록된 일정이 없습니다.',
  )
})

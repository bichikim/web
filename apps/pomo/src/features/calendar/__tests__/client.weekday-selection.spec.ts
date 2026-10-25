/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {apiJson} from '../../api-json'
import {loadCalendarPromptContext} from '../client'
import type {CalendarEvent} from '../types'

vi.mock('../../api-json', () => ({apiJson: vi.fn()}))

const events: readonly CalendarEvent[] = [
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-07T04:00:00.000Z',
    id: 'monday',
    provider: 'google',
    start: '2026-09-07T03:00:00.000Z',
    title: '제외할 월요일 일정',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-08T01:00:00.000Z',
    id: 'tuesday-am',
    provider: 'google',
    start: '2026-09-08T00:00:00.000Z',
    title: '화요일 오전 일정',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-08T07:00:00.000Z',
    id: 'tuesday-pm',
    provider: 'google',
    start: '2026-09-08T06:00:00.000Z',
    title: '화요일 오후 일정',
  },
]

beforeEach(() => {
  vi.mocked(apiJson).mockReset()
  vi.mocked(apiJson).mockImplementation(async (input, options) => {
    const search = new URL(String(input), 'https://fixture.invalid').searchParams
    const start = search.get('start') ?? ''
    const end = search.get('end') ?? ''
    return options.responseSchema.parse({
      connectedConnections: 1,
      events: events.filter((event) => event.start < end && event.end > start),
      timeZone: 'Asia/Seoul',
      truncated: false,
      unavailableConnections: 0,
    })
  })
})

const observe = (context: string | null) => {
  expect(apiJson).toHaveBeenCalledTimes(1)
  const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(input), 'https://fixture.invalid').searchParams
  return {
    end: search.get('end'),
    includesMonday: context?.includes('제외할 월요일 일정'),
    includesTuesdayAM: context?.includes('화요일 오전 일정'),
    includesTuesdayPM: context?.includes('화요일 오후 일정'),
    start: search.get('start'),
  }
}

it.each(
  ['2026-09-03T10:30:00.000Z', '2026-09-04T10:30:00.000Z'].flatMap((now) =>
    [
      '다음 주 월요일 오전 말고 화요일 오후 일정 알려줘',
      '다음 주 월요일 오후 말고 화요일 오전 일정 알려줘',
      '다음 주 월요일 저녁 말고 화요일 오후 일정 알려줘',
    ].map((text) => ({now, text})),
  ),
)(
  'should ground the canonical whole Tuesday without Monday at $now in $text',
  async ({now, text}) => {
    const context = await loadCalendarPromptContext({
      now: new Date(now),
      text,
      timeZone: 'Asia/Seoul',
    })
    expect(observe(context)).toEqual({
      end: '2026-09-08T15:00:00.000Z',
      includesMonday: false,
      includesTuesdayAM: true,
      includesTuesdayPM: true,
      start: '2026-09-07T15:00:00.000Z',
    })
  },
)

it.each(['다음 주 화요일 오후 일정 알려줘', '다음 주 월요일 말고 화요일 오후 일정 알려줘'])(
  'should retain the existing full-Tuesday canonical grounding in %s',
  async (text) => {
    const context = await loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text,
      timeZone: 'Asia/Seoul',
    })
    expect(observe(context)).toEqual({
      end: '2026-09-08T15:00:00.000Z',
      includesMonday: false,
      includesTuesdayAM: true,
      includesTuesdayPM: true,
      start: '2026-09-07T15:00:00.000Z',
    })
  },
)

it.each([
  {
    end: '2026-09-08T15:00:00.000Z',
    includesMonday: true,
    includesTuesdayAM: true,
    includesTuesdayPM: true,
    start: '2026-09-06T15:00:00.000Z',
    text: '다음 주 월요일 오전 화요일 오후 일정 알려줘',
  },
  {
    end: '2026-09-07T15:00:00.000Z',
    includesMonday: true,
    includesTuesdayAM: false,
    includesTuesdayPM: false,
    start: '2026-09-06T15:00:00.000Z',
    text: '다음 주 월요일 오전 말고 오후 일정 알려줘',
  },
  {
    end: '2026-09-06T15:00:00.000Z',
    includesMonday: false,
    includesTuesdayAM: false,
    includesTuesdayPM: false,
    start: '2026-09-06T03:00:00.000Z',
    text: '내일 오전 말고 모레 오후 일정 알려줘',
  },
])(
  'should preserve the existing date and positive-selection behavior in $text',
  async ({text, ...expected}) => {
    const context = await loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text,
      timeZone: 'Asia/Seoul',
    })
    expect(observe(context)).toEqual(expected)
  },
)

it('should not request calendar events for an unrelated topic', async () => {
  await expect(
    loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '다음 주 월요일 오전 말고 화요일 오후 날씨 알려줘',
      timeZone: 'Asia/Seoul',
    }),
  ).resolves.toBeNull()
  expect(apiJson).not.toHaveBeenCalled()
})

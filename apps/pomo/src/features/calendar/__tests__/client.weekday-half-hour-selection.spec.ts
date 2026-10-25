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
    end: '2026-08-31T04:00:00.000Z',
    id: 'oldmonday',
    provider: 'google',
    start: '2026-08-31T03:00:00.000Z',
    title: '이번 주 제외할 월요일',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-01T01:00:00.000Z',
    id: 'oldTuesdayAM',
    provider: 'google',
    start: '2026-09-01T00:00:00.000Z',
    title: '이번 주 화요일 오전',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-01T07:00:00.000Z',
    id: 'oldTuesdayPM',
    provider: 'google',
    start: '2026-09-01T06:00:00.000Z',
    title: '이번 주 화요일 오후',
  },
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
  'should request and ground the canonical replacement after half-hour exclusion in $text',
  async ({canonical, text}) => {
    const expected = await loadCalendarPromptContext({...options, text: canonical})
    const expectedURL = vi.mocked(apiJson).mock.calls[0]?.[0]
    vi.mocked(apiJson).mockClear()
    const actual = await loadCalendarPromptContext({...options, text})
    expect(apiJson).toHaveBeenCalledTimes(1)
    expect(vi.mocked(apiJson).mock.calls[0]?.[0]).toEqual(expectedURL)
    expect(actual).toEqual(expected)
    expect(actual).not.toContain('제외할 월요일')
    expect(actual).toContain('화요일 오후')
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
])('should preserve the existing request and grounding for $text', async ({expected, text}) => {
  const context = await loadCalendarPromptContext({...options, text})
  if (expected === null) {
    expect(apiJson).not.toHaveBeenCalled()
    expect(context).toBeNull()
    return
  }
  expect(apiJson).toHaveBeenCalledTimes(1)
  const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(input), 'https://fixture.invalid').searchParams
  expect({end: search.get('end'), start: search.get('start')}).toEqual(expected)
  for (const event of events) {
    expect(context?.includes(event.title)).toBe(
      event.start < expected.end && event.end > expected.start,
    )
  }
})

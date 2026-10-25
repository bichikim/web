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
    end: '2026-09-12T04:00:00.000Z',
    id: 'next',
    provider: 'google',
    start: '2026-09-12T03:00:00.000Z',
    title: '다음 주말 일정',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-06T13:00:00.000Z',
    id: 'weekend',
    provider: 'google',
    start: '2026-09-06T12:00:00.000Z',
    title: '다가오는 주말 일정',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-09T04:00:00.000Z',
    id: 'weekday',
    provider: 'google',
    start: '2026-09-09T03:00:00.000Z',
    title: '주말 밖 수요일 일정',
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

it.each([
  {now: '2026-09-04T10:30:00.000Z', text: '이번 주말 말고 다음 주말 일정 알려줘'},
  {now: '2026-09-04T10:30:00.000Z', text: '이번주말말고다음주말일정 알려줘'},
  {now: '2026-09-04T10:30:00.000Z', text: '다음 주말 이번 주말 말고 일정 알려줘'},
  {now: '2026-09-05T10:30:00.000Z', text: '이번 주말 말고 다음 주말 일정 알려줘'},
  {now: '2026-09-05T10:30:00.000Z', text: '이번주말말고다음주말일정 알려줘'},
  {now: '2026-09-05T10:30:00.000Z', text: '다음 주말 이번 주말 말고 일정 알려줘'},
  {now: '2026-09-06T10:30:00.000Z', text: '이번 주말 말고 다음 주말 일정 알려줘'},
  {now: '2026-09-06T10:30:00.000Z', text: '이번주말말고다음주말일정 알려줘'},
  {now: '2026-09-06T10:30:00.000Z', text: '다음 주말 이번 주말 말고 일정 알려줘'},
])(
  'should request and ground next weekend after excluding this weekend in $text at $now',
  async ({now, text}) => {
    const options = {now: new Date(now), timeZone: 'Asia/Seoul'}
    const canonical = await loadCalendarPromptContext({...options, text: '다음 주말 일정 알려줘'})
    const expectedURL = vi.mocked(apiJson).mock.calls[0]?.[0]
    vi.mocked(apiJson).mockClear()
    const context = await loadCalendarPromptContext({...options, text})
    expect(apiJson).toHaveBeenCalledTimes(1)
    expect(vi.mocked(apiJson).mock.calls[0]?.[0]).toEqual(expectedURL)
    expect(context).toEqual(canonical)
    expect(context).toContain('다음 주말 일정')
    expect(context).not.toContain('주말 밖 수요일 일정')
  },
)
it.each([
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말에는 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 일정도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 오후만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-20T15:00:00.000Z', start: '2026-09-18T15:00:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 다다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-04T15:00:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '다음 주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-13T15:00:00.000Z', start: '2026-09-11T15:00:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 일정 알려줘',
  },
  {
    expected: null,
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말에 관한 글 써줘',
  },
  {
    expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    now: '2026-09-04T10:30:00.000Z',
    text: '이번 주 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말에는 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 일정도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 오후만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-20T15:00:00.000Z', start: '2026-09-18T15:00:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 다다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '다음 주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-13T15:00:00.000Z', start: '2026-09-11T15:00:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 일정 알려줘',
  },
  {
    expected: null,
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말에 관한 글 써줘',
  },
  {
    expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-05T10:30:00.000Z'},
    now: '2026-09-05T10:30:00.000Z',
    text: '이번 주 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말에는 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 일정도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 오후만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-20T15:00:00.000Z', start: '2026-09-18T15:00:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말 다다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '다음 주말 말고 이번 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-09-13T15:00:00.000Z', start: '2026-09-11T15:00:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 다음 주말 일정 알려줘',
  },
  {
    expected: {end: '2026-10-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 일정 알려줘',
  },
  {
    expected: null,
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주말 말고 다음 주말에 관한 글 써줘',
  },
  {
    expected: {end: '2026-09-06T15:00:00.000Z', start: '2026-09-06T10:30:00.000Z'},
    now: '2026-09-06T10:30:00.000Z',
    text: '이번 주 일정 알려줘',
  },
])(
  'should preserve the existing request and grounding for $text at $now',
  async ({expected, now, text}) => {
    const context = await loadCalendarPromptContext({
      now: new Date(now),
      text,
      timeZone: 'Asia/Seoul',
    })
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
  },
)

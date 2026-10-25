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

const days = [
  {day: 'Thursday', now: '2026-09-03T10:30:00.000Z', start: '2026-09-04T15:00:00.000Z'},
  {day: 'Friday', now: '2026-09-04T10:30:00.000Z', start: '2026-09-04T15:00:00.000Z'},
  {day: 'Saturday', now: '2026-09-05T10:30:00.000Z', start: '2026-09-05T10:30:00.000Z'},
  {day: 'Sunday', now: '2026-09-06T10:30:00.000Z', start: '2026-09-06T10:30:00.000Z'},
]

it.each(
  days.flatMap((day) =>
    ['지난 주말', '다다음 주말'].map((qualified) => ({
      ...day,
      text: `${qualified} 말고 주말 일정 알려줘`,
    })),
  ),
)(
  'should request and ground only the upcoming weekend on $day in $text',
  async ({now, start, text}) => {
    const context = await loadCalendarPromptContext({
      now: new Date(now),
      text,
      timeZone: 'Asia/Seoul',
    })
    expect(apiJson).toHaveBeenCalledTimes(1)
    const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
    const search = new URL(String(input), 'https://fixture.invalid').searchParams
    expect({
      end: search.get('end'),
      includesWeekday: context?.includes('주말 밖 수요일 일정'),
      includesWeekend: context?.includes('다가오는 주말 일정'),
      start: search.get('start'),
    }).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      includesWeekday: false,
      includesWeekend: true,
      start,
    })
  },
)

it.each(days)(
  'should retain the canonical upcoming request and grounding on $day',
  async ({now, start}) => {
    const context = await loadCalendarPromptContext({
      now: new Date(now),
      text: '주말 일정 알려줘',
      timeZone: 'Asia/Seoul',
    })
    expect(apiJson).toHaveBeenCalledTimes(1)
    const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
    const search = new URL(String(input), 'https://fixture.invalid').searchParams
    expect({
      end: search.get('end'),
      includesWeekday: context?.includes('주말 밖 수요일 일정'),
      includesWeekend: context?.includes('다가오는 주말 일정'),
      start: search.get('start'),
    }).toEqual({
      end: '2026-09-06T15:00:00.000Z',
      includesWeekday: false,
      includesWeekend: true,
      start,
    })
  },
)

it.each([
  {
    end: '2026-09-13T15:00:00.000Z',
    includesWeekday: true,
    includesWeekend: false,
    start: '2026-09-06T15:00:00.000Z',
    text: '주말 말고 다음 주 일정 알려줘',
  },
  {
    end: '2026-09-20T15:00:00.000Z',
    includesWeekday: false,
    includesWeekend: false,
    start: '2026-09-18T15:00:00.000Z',
    text: '주말 말고 다다음 주말 일정 알려줘',
  },
  {
    end: '2026-10-04T10:30:00.000Z',
    includesWeekday: true,
    includesWeekend: true,
    start: '2026-09-04T10:30:00.000Z',
    text: '다다음 주말 말고 주말 말고 일정 알려줘',
  },
])('should preserve the existing range and grounding in $text', async ({text, ...expected}) => {
  const context = await loadCalendarPromptContext({
    now: new Date('2026-09-04T10:30:00.000Z'),
    text,
    timeZone: 'Asia/Seoul',
  })
  expect(apiJson).toHaveBeenCalledTimes(1)
  const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(input), 'https://fixture.invalid').searchParams
  expect({
    end: search.get('end'),
    includesWeekday: context?.includes('주말 밖 수요일 일정'),
    includesWeekend: context?.includes('다가오는 주말 일정'),
    start: search.get('start'),
  }).toEqual(expected)
})

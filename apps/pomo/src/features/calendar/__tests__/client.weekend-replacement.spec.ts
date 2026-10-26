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
  ['다음 주말 말고 주말 일정 알려줘', '주말 일정 알려줘'],
  ['다음 주말은 말고 주말 일정 알려줘', '주말 일정 알려줘'],
  ['다음주말말고주말일정 알려줘', '주말 일정 알려줘'],
  ['주말 다음 주말 말고 일정 알려줘', '주말 일정 알려줘'],
  ['다다음 주말 말고 다음 주말 일정 알려줘', '다음 주말 일정 알려줘'],
  ['다다음주말말고다음주말일정 알려줘', '다음 주말 일정 알려줘'],
  ['다음 주말 다다음 주말 말고 일정 알려줘', '다음 주말 일정 알려줘'],
])(
  'should request and ground only the canonical selected weekend in %s',
  async (text, canonical) => {
    const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone: 'Asia/Seoul'}
    const expected = await loadCalendarPromptContext({...options, text: canonical})
    const canonicalUrl = vi.mocked(apiJson).mock.calls[0]?.[0]
    vi.mocked(apiJson).mockClear()
    const actual = await loadCalendarPromptContext({...options, text})
    expect(apiJson).toHaveBeenCalledTimes(1)
    expect(vi.mocked(apiJson).mock.calls[0]?.[0]).toEqual(canonicalUrl)
    expect(actual).toEqual(expected)
    expect(actual).not.toContain('주말 밖 수요일 일정')
    expect(actual).toContain(canonical.startsWith('다음') ? '다음 주말 일정' : '다가오는 주말 일정')
  },
)

it.each([
  '다다음 주말 말고 다음 주말도 말고 일정 알려줘',
  '다다음 주말 말고 다음 주말에는 말고 일정 알려줘',
  '다다음 주말 말고 다음 주말이 아닌 일정 알려줘',
  '다다음 주말 말고 다음 주말도 빼고 일정 알려줘',
  '다다음 주말 말고 다음 주말만 제외하고 일정 알려줘',
  '다다음 주말 말고 다음 주말은 안 돼 일정 알려줘',
])(
  'should preserve the fallback request and grounding for both excluded weekends in %s',
  async (text) => {
    const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone: 'Asia/Seoul'}
    const context = await loadCalendarPromptContext({...options, text})
    expect(apiJson).toHaveBeenCalledTimes(1)
    const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
    const search = new URL(String(input), 'https://fixture.invalid').searchParams
    expect({end: search.get('end'), start: search.get('start')}).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: options.now.toISOString(),
    })
    expect(context).toContain('주말 밖 수요일 일정')
    expect(context).toContain('다음 주말 일정')
  },
)

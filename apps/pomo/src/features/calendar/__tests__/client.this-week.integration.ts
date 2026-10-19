/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

vi.mock('src/features/api-json', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/api-json')>()
  return {...actual, apiJson: vi.fn()}
})

import {apiJson} from 'src/features/api-json'
import {loadCalendarPromptContext, type CalendarEvents} from '../client'
import type {CalendarEvent} from '../types'

beforeEach(() => {
  vi.clearAllMocks()
  const events: ReadonlyArray<CalendarEvent> = [
    {
      accountLabel: 'fixture@example.invalid',
      allDay: false,
      calendarLabel: '업무',
      end: '2026-09-04T12:00:00.000Z',
      id: 'past-event',
      provider: 'microsoft',
      start: '2026-09-04T11:00:00.000Z',
      title: '금요일 검증 일정',
    },
    {
      accountLabel: 'fixture@example.invalid',
      allDay: false,
      calendarLabel: '업무',
      end: '2026-09-05T12:00:00.000Z',
      id: 'future-event',
      provider: 'microsoft',
      start: '2026-09-05T11:00:00.000Z',
      title: '토요일 검증 일정',
    },
  ]
  vi.mocked(apiJson).mockImplementation(async (input) => {
    const url = new URL(String(input), 'https://fixture.invalid')
    const start = Date.parse(url.searchParams.get('start') ?? '')
    const end = Date.parse(url.searchParams.get('end') ?? '')
    return {
      connectedConnections: 1,
      events: events.filter(
        (event) => Date.parse(event.start) < end && Date.parse(event.end) > start,
      ),
      timeZone: 'Asia/Seoul',
      truncated: false,
      unavailableConnections: 0,
    } satisfies CalendarEvents
  })
})

it.each([
  '이번 주 금요일 일정 알려줘',
  '이번주금요일 일정 알려줘',
  '이번 주에 금요일 일정 알려줘',
  '이번 주의 금요일 일정 알려줘',
  '이번 주에 금요일 뭐 있어?',
])(
  'should ground the current named weekday through the real client query and prompt for "%s"',
  async (text) => {
    const context = await loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text,
      timeZone: 'Asia/Seoul',
    })
    expect(apiJson).toHaveBeenCalledOnce()
    const request = new URL(
      String(vi.mocked(apiJson).mock.calls[0]?.[0]),
      'https://fixture.invalid',
    )
    expect(request.pathname).toBe('/calendar/events')
    expect(request.searchParams.get('start')).toBe('2026-09-04T10:30:00.000Z')
    expect(request.searchParams.get('end')).toBe('2026-09-04T15:00:00.000Z')
    expect(context).toContain('금요일 검증 일정')
    expect(context).not.toContain('토요일 검증 일정')
  },
)

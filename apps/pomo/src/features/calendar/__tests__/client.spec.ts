/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {apiJson} from '../../api-json'
import type {CalendarRepository} from 'src/server/repositories/calendar'
import {createMicrosoftCalendarProvider} from 'src/server/calendar/providers/microsoft'
import {createCalendarService} from 'src/server/calendar/service'
import type {TokenVault} from 'src/server/calendar/token-vault'
import {listCalendarEvents, loadCalendarPromptContext} from '../client'

vi.mock('../../api-json', () => ({apiJson: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('should load a requested calendar range for calendar views', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })

  await expect(
    listCalendarEvents({
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-08-31T15:00:00.000Z',
      timeZone: 'Asia/Seoul',
    }),
  ).resolves.toEqual({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })
  const [requestUrl, requestOptions] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(requestUrl), 'https://pomofi.io').searchParams

  expect(search.get('start')).toBe('2026-08-31T15:00:00.000Z')
  expect(search.get('end')).toBe('2026-09-30T15:00:00.000Z')
  expect(search.get('timeZone')).toBe('Asia/Seoul')
  expect(requestOptions).toEqual(expect.objectContaining({responseSchema: expect.any(Object)}))
})

it.each(['오늘 날씨 알려줘', '오늘 날씨 뭐 있어?', '오늘 뉴스 뭐 있어?', '오늘 뭐 뉴스 있어?'])(
  'should skip the API for a question without calendar intent: "%s"',
  async (text) => {
    await expect(
      loadCalendarPromptContext({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text,
        timeZone: 'Asia/Seoul',
      }),
    ).resolves.toBeNull()
    expect(apiJson).not.toHaveBeenCalled()
  },
)

it('should fetch only the resolved range and create grounded prompt context', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })

  await expect(
    loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '오늘 일정 알려줘',
      timeZone: 'Asia/Seoul',
    }),
  ).resolves.toContain('조회 기간에 등록된 일정이 없습니다.')
  const requestUrl = new URL(String(vi.mocked(apiJson).mock.calls[0]?.[0]), 'https://pomofi.io')
  expect(requestUrl.searchParams.get('start')).toBe('2026-09-04T10:30:00.000Z')
  expect(requestUrl.searchParams.get('end')).toBe('2026-09-04T15:00:00.000Z')
  expect(requestUrl.searchParams.get('timeZone')).toBe('Asia/Seoul')
})

it('should fetch the day-after-tomorrow range for an implicit schedule question', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })

  await loadCalendarPromptContext({
    now: new Date('2026-09-04T10:30:00.000Z'),
    text: '모레 뭐 있어?',
    timeZone: 'Asia/Seoul',
  })

  expect(apiJson).toHaveBeenCalledOnce()
  const requestUrl = new URL(String(vi.mocked(apiJson).mock.calls[0]?.[0]), 'https://pomofi.io')
  expect(requestUrl.searchParams.get('start')).toBe('2026-09-05T15:00:00.000Z')
  expect(requestUrl.searchParams.get('end')).toBe('2026-09-06T15:00:00.000Z')
  expect(requestUrl.searchParams.get('timeZone')).toBe('Asia/Seoul')
})

it('should send an exact local-noon instant query to the calendar API', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })

  await loadCalendarPromptContext({
    now: new Date('2026-09-04T10:30:00.000Z'),
    text: '오늘 정오 뭐 있어?',
    timeZone: 'Asia/Seoul',
  })

  const requestUrl = new URL(String(vi.mocked(apiJson).mock.calls[0]?.[0]), 'https://pomofi.io')
  expect(requestUrl.searchParams.get('at')).toBe('2026-09-04T03:00:00.000Z')
  expect(requestUrl.searchParams.get('start')).toBeNull()
  expect(requestUrl.searchParams.get('end')).toBeNull()
})

it('should retain Microsoft UTC all-day noon membership through service and public prompt loading', async () => {
  const timeZone = 'America/Los_Angeles'
  const at = '2026-09-04T19:00:00.000Z'
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/me/calendars')) {
      return Response.json({value: [{id: 'work', name: '업무'}]})
    }

    return Response.json({
      value: [
        {
          end: {dateTime: '2026-09-05T00:00:00.0000000', timeZone: 'UTC'},
          id: 'all-day-crosses-local-noon',
          isAllDay: true,
          start: {dateTime: '2026-09-04T00:00:00.0000000', timeZone: 'UTC'},
          subject: '정오에도 진행 중인 종일 일정',
        },
        {
          end: {dateTime: '2026-09-04T19:30:00.0000000', timeZone: 'UTC'},
          id: 'starts-at-local-noon',
          isAllDay: false,
          start: {dateTime: '2026-09-04T19:00:00.0000000', timeZone: 'UTC'},
          subject: '정오 시작 일정',
        },
        {
          end: {dateTime: '2026-09-04T19:00:00.0000000', timeZone: 'UTC'},
          id: 'ends-at-local-noon',
          isAllDay: false,
          start: {dateTime: '2026-09-04T18:30:00.0000000', timeZone: 'UTC'},
          subject: '정오 종료 일정',
        },
        {
          end: {dateTime: at, timeZone: 'UTC'},
          id: 'zero-length-at-noon',
          isAllDay: false,
          start: {dateTime: at, timeZone: 'UTC'},
          subject: '길이 없는 정오 일정',
        },
      ],
    })
  })
  const microsoftProvider = createMicrosoftCalendarProvider({
    clientId: 'client',
    clientSecret: 'secret',
    fetch,
  })
  const repository: CalendarRepository = {
    consumeOauthState: vi.fn(),
    createOauthState: vi.fn(),
    deleteConnection: vi.fn(),
    listConnections: vi.fn().mockResolvedValue([
      {
        accountLabel: 'work@example.com',
        encryptedTokens: 'sealed',
        id: 'microsoft-connection',
        provider: 'microsoft',
      },
    ]),
    saveConnection: vi.fn(),
    withLockedTokens: vi.fn(),
  }
  const vault: TokenVault = {
    open: vi.fn(() => ({accessToken: 'access', expiresAt: null, refreshToken: null})),
    seal: vi.fn(() => 'sealed'),
  }
  const calendarService = createCalendarService({
    providerFor: () => microsoftProvider,
    repository,
    vault,
  })
  const events = await calendarService.listEvents({at, displayTimeZone: timeZone, userId: 'user-1'})

  expect(events.events.map(({id}) => id)).toEqual([
    'microsoft-connection:all-day-crosses-local-noon',
    'microsoft-connection:starts-at-local-noon',
  ])
  expect(events.events[0]).toMatchObject({end: '2026-09-04', start: '2026-09-03'})
  expect(events.events[0]).not.toHaveProperty('exactInstantRange')

  vi.mocked(apiJson).mockResolvedValue({...events, timeZone})
  const context = await loadCalendarPromptContext({
    now: new Date(at),
    text: '오늘 정오 뭐 있어?',
    timeZone,
  })

  expect(context).toContain('정오에도 진행 중인 종일 일정')
  expect(context).toContain('정오 시작 일정')
  expect(context).not.toContain('정오 종료 일정')
  expect(context).not.toContain('길이 없는 정오 일정')
  expect(context).not.toContain('일부 일정만 확인했습니다.')
  const requestUrl = new URL(String(vi.mocked(apiJson).mock.calls[0]?.[0]), 'https://pomofi.io')
  expect(requestUrl.searchParams.get('at')).toBe(at)
  const eventRequest = fetch.mock.calls.find(([input]) =>
    new URL(String(input)).pathname.endsWith('/calendarView'),
  )
  expect(eventRequest?.[1]).toEqual(
    expect.objectContaining({headers: expect.objectContaining({Prefer: 'outlook.timezone="UTC"'})}),
  )
})

it('should answer an expired remaining-daypart query without requesting another date', async () => {
  await expect(
    loadCalendarPromptContext({
      now: new Date('2026-09-04T12:30:00.000Z'),
      text: '오늘 저녁 남은 일정 알려줘',
      timeZone: 'Asia/Seoul',
    }),
  ).resolves.toContain('조회 기간에 등록된 일정이 없습니다.')
  expect(apiJson).not.toHaveBeenCalled()
})

it('should send the resolved next-week range to calendar events', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })

  await loadCalendarPromptContext({
    now: new Date('2026-09-04T10:30:00.000Z'),
    text: '다음 주 일정 알려줘',
    timeZone: 'Asia/Seoul',
  })

  const requestUrl = new URL(String(vi.mocked(apiJson).mock.calls[0]?.[0]), 'https://pomofi.io')
  expect(requestUrl.searchParams.get('start')).toBe('2026-09-06T15:00:00.000Z')
  expect(requestUrl.searchParams.get('end')).toBe('2026-09-13T15:00:00.000Z')
  expect(requestUrl.searchParams.get('timeZone')).toBe('Asia/Seoul')
})

it('should tell the model when no calendar is connected', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 0,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })

  await expect(
    loadCalendarPromptContext({text: '다음 미팅 언제야?', timeZone: 'Asia/Seoul'}),
  ).resolves.toBe(
    '연결된 캘린더가 없습니다. 일정이 없다고 답하지 말고 캘린더 연결이 필요하다고 안내하세요.',
  )
})

it('should bound calendar events added to the local-model prompt', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: Array.from({length: 41}, (_, index) => ({
      accountLabel: 'person@example.com',
      allDay: true,
      calendarLabel: '업무',
      end: '2026-09-06',
      id: `event-${index}`,
      provider: 'google',
      start: '2026-09-05',
      title: `일정 ${index}`,
    })),
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })

  const context = await loadCalendarPromptContext({
    text: '다음 일정 알려줘',
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('일정 39')
  expect(context).not.toContain('일정 40')
  expect(context).toContain('일부 일정만 확인했습니다.')
})

it('should not claim an empty schedule when the provider result is truncated', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: true,
    unavailableConnections: 0,
  })
  const context = await loadCalendarPromptContext({
    text: '오늘 일정 알려줘',
    timeZone: 'Asia/Seoul',
  })
  expect(context).toContain('일부 일정만 확인했습니다.')
  expect(context).not.toContain('조회 기간에 등록된 일정이 없습니다.')
})

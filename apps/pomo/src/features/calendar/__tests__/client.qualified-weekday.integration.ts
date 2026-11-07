/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {apiFetch} from '../../http-client'
import {loadCalendarPromptContext} from '../client'
import {createChatMessages} from '../../chat/prompt'
import {createGoogleCalendarProvider} from 'src/server/calendar/providers/google'
import {createCalendarService} from 'src/server/calendar/service'
import type {CalendarRepository} from 'src/server/repositories/calendar'
import type {TokenVault} from 'src/server/calendar/token-vault'

vi.mock('../../http-client', () => ({apiFetch: vi.fn()}))

const now = new Date('2026-09-04T10:30:00.000Z')
const timeZone = 'Asia/Seoul'
const warning =
  '일부 일정만 확인했습니다. 누락 가능성을 알리고, 전체 일정이나 일정이 없다고 단정하지 마세요.'
const availabilityWarning = '일부 연결은 조회하지 못했습니다. 누락 가능성을 짧게 알리세요.'
const periods = [
  {
    earlierDay: '2026-09-14',
    end: '2026-09-15T15:00:00.000Z',
    issue: '#3686',
    start: '2026-09-14T15:00:00.000Z',
    targetDay: '2026-09-15',
    text: '다다음 주 화요일 일정 알려줘',
  },
  {
    earlierDay: '2026-08-24',
    end: '2026-08-26T15:00:00.000Z',
    issue: '#3687',
    start: '2026-08-25T15:00:00.000Z',
    targetDay: '2026-08-26',
    text: '지난 주 수요일 일정 알려줘',
  },
  {
    earlierDay: '2026-09-07',
    end: '2026-09-08T15:00:00.000Z',
    issue: 'supported control',
    start: '2026-09-07T15:00:00.000Z',
    targetDay: '2026-09-08',
    text: '다음 주 화요일 일정 알려줘',
  },
]

const scenarios = [
  ...periods.flatMap((period) =>
    [2, 39, 40].map((earlierCount) => ({
      ...period,
      afternoon: false,
      earlierCount,
      wholeWeek: false,
    })),
  ),
  ...periods.slice(0, 2).map((period) => ({
    ...period,
    afternoon: true,
    earlierCount: 40,
    text: period.text.replace('일정', '오후 일정'),
    wholeWeek: false,
  })),
  ...[
    {
      ...periods[0],
      end: '2026-09-20T15:00:00.000Z',
      start: '2026-09-13T15:00:00.000Z',
      text: '다다음 주 일정 알려줘',
    },
    {
      ...periods[1],
      end: '2026-08-30T15:00:00.000Z',
      start: '2026-08-23T15:00:00.000Z',
      text: '지난 주 일정 알려줘',
    },
  ].map((period) => ({...period, afternoon: false, earlierCount: 40, wholeWeek: true})),
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Unexpected real transport')
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loadCalendarPromptContext qualified weekdays', () => {
  it.each(scenarios)(
    'should preserve grounding for $text with $earlierCount earlier events',
    async (scenario) => {
      const targetTitle = `TARGET-${scenario.targetDay}`
      const target = {
        end: {dateTime: new Date(`${scenario.targetDay}T10:00:00+09:00`).toISOString()},
        id: 'target',
        start: {dateTime: new Date(`${scenario.targetDay}T09:00:00+09:00`).toISOString()},
        summary: targetTitle,
      }
      const earlierStart = new Date(`${scenario.earlierDay}T08:00:00+09:00`).getTime()
      const earlierEvents = Array.from({length: scenario.earlierCount}, (_, index) => ({
        end: {dateTime: new Date(earlierStart + (index * 15 + 10) * 60_000).toISOString()},
        id: `earlier-${index}`,
        start: {dateTime: new Date(earlierStart + index * 15 * 60_000).toISOString()},
        summary: `EARLIER-${index}`,
      }))
      const afternoonTitle = `AFTERNOON-${scenario.targetDay}`
      const afternoonEvents = scenario.afternoon
        ? [
            {
              end: {dateTime: new Date(`${scenario.targetDay}T16:00:00+09:00`).toISOString()},
              id: 'afternoon',
              start: {dateTime: new Date(`${scenario.targetDay}T15:00:00+09:00`).toISOString()},
              summary: afternoonTitle,
            },
          ]
        : []
      const storedEvents = [...afternoonEvents, target, ...earlierEvents.toReversed()]
      const transport = vi.fn<typeof globalThis.fetch>()
      transport.mockImplementation(async (input) => {
        const url = new URL(String(input))
        if (url.pathname === '/calendar/v3/users/me/calendarList') {
          return Response.json({items: [{id: 'synthetic', summary: 'Synthetic', timeZone}]})
        }
        expect(url.pathname).toBe('/calendar/v3/calendars/synthetic/events')
        expect(url.searchParams.get('orderBy')).toBe('startTime')
        expect(url.searchParams.get('singleEvents')).toBe('true')
        const rangeStart = url.searchParams.get('timeMin') ?? ''
        const rangeEnd = url.searchParams.get('timeMax') ?? ''
        // Google range selection occurs remotely; this fake transport implements that boundary.
        const items = storedEvents
          .filter((event) => event.start.dateTime < rangeEnd && event.end.dateTime > rangeStart)
          .toSorted((left, right) => left.start.dateTime.localeCompare(right.start.dateTime))
        return Response.json({items})
      })
      const provider = createGoogleCalendarProvider({
        clientId: 'synthetic-client',
        clientSecret: 'synthetic-secret',
        fetch: transport,
        now: () => now,
      })
      const providerRead = vi.spyOn(provider, 'listEvents')
      const repository: CalendarRepository = {
        consumeOauthState: vi.fn(),
        createOauthState: vi.fn(),
        deleteConnection: vi.fn(),
        listConnections: vi.fn().mockResolvedValue([
          {
            accountLabel: 'synthetic@example.invalid',
            encryptedTokens: 'synthetic-tokens',
            id: 'synthetic-connection',
            provider: 'google',
          },
        ]),
        saveConnection: vi.fn(),
        withLockedTokens: vi.fn(),
      }
      const vault: TokenVault = {
        open: vi
          .fn()
          .mockReturnValue({accessToken: 'synthetic-access', expiresAt: null, refreshToken: null}),
        seal: vi.fn(),
      }
      const service = createCalendarService({
        now: () => now,
        providerFor: () => provider,
        repository,
        vault,
      })
      const serviceRead = vi.spyOn(service, 'listEvents')
      vi.mocked(apiFetch).mockImplementation(async (input) => {
        const url = new URL(String(input), 'https://synthetic.invalid/api/')
        expect(url.pathname).toBe('/api/calendar/events')
        const result = await service.listEvents({
          displayTimeZone: url.searchParams.get('timeZone') ?? '',
          end: url.searchParams.get('end') ?? '',
          start: url.searchParams.get('start') ?? '',
          userId: 'synthetic-user',
        })
        return Response.json({...result, timeZone})
      })

      const context = await loadCalendarPromptContext({now, text: scenario.text, timeZone})
      expect(context).not.toBeNull()
      if (context === null) {
        throw new Error('Missing calendar context')
      }
      const [providerCall] = providerRead.mock.results
      const [serviceCall] = serviceRead.mock.results
      if (providerCall?.type !== 'return' || serviceCall?.type !== 'return') {
        throw new Error('Calendar reads must return normally')
      }
      const providerResult = await providerCall.value
      const serviceResult = await serviceCall.value
      const matchedCount = scenario.wholeWeek ? 41 : scenario.afternoon ? 2 : 1
      const omitted = scenario.wholeWeek
      expect(context.includes(targetTitle)).toBe(!omitted)
      expect(providerResult.events).toHaveLength(matchedCount)
      expect(providerResult.events.some((event) => event.title === targetTitle)).toBe(true)
      expect(serviceResult.events).toHaveLength(matchedCount)
      expect(serviceResult.events.at(-1)?.title).toBe(
        scenario.afternoon ? afternoonTitle : targetTitle,
      )
      expect(serviceResult.events.map((event) => event.start)).toEqual(
        serviceResult.events.map((event) => event.start).toSorted(),
      )
      expect(serviceResult.truncated).toBe(false)
      expect(serviceResult.unavailableConnections).toBe(0)
      expect(context.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(
        Math.min(matchedCount, 40),
      )
      expect(context.includes(targetTitle)).toBe(!omitted)
      expect(context.includes(warning)).toBe(omitted)
      expect(context.includes(availabilityWarning)).toBe(false)
      if (!omitted) {
        expect(context).toContain(`${scenario.targetDay.replace(/-0?/g, '. ')}.`)
        expect(context).not.toContain('EARLIER-')
      }
      expect(context.includes(afternoonTitle)).toBe(scenario.afternoon)
      const messages = createChatMessages({
        messages: [{content: scenario.text, id: 'synthetic-question', role: 'user'}],
        summary: '',
        supplementaryContext: context,
      })
      expect(messages[0].content).toContain(context)
      expect(messages[0].content.includes(targetTitle)).toBe(!omitted)
      expect(messages[0].content.includes(warning)).toBe(omitted)
      expect(messages[1]).toEqual({content: scenario.text, role: 'user'})
      const [apiInput] = vi.mocked(apiFetch).mock.calls[0]
      expect(
        Object.fromEntries(
          new URL(String(apiInput), 'https://synthetic.invalid/api/').searchParams,
        ),
      ).toEqual({end: scenario.end, start: scenario.start, timeZone})
      expect(providerRead.mock.calls[0][0]).toMatchObject({
        displayTimeZone: timeZone,
        end: scenario.end,
        start: scenario.start,
      })
      expect(apiFetch).toHaveBeenCalledOnce()
      expect(transport).toHaveBeenCalledTimes(2)
      expect(globalThis.fetch).not.toHaveBeenCalled()
      expect(repository.saveConnection).not.toHaveBeenCalled()
      expect(repository.createOauthState).not.toHaveBeenCalled()
      expect(repository.consumeOauthState).not.toHaveBeenCalled()
      expect(repository.deleteConnection).not.toHaveBeenCalled()
      expect(repository.withLockedTokens).not.toHaveBeenCalled()
    },
  )
})

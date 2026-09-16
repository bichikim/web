/** @vitest-environment node */
import type {APIEvent} from '@solidjs/start/server'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createMicrosoftCalendarProvider} from 'src/server/calendar/providers/microsoft'
import {type CalendarRepository, createCalendarService} from 'src/server/calendar/service'
import type {TokenVault} from 'src/server/calendar/token-vault'

const dependencyMocks = vi.hoisted(() => ({
  getCalendarService: vi.fn(),
  listEvents: vi.fn(),
  resolveUserRequest: vi.fn(),
}))

vi.mock('src/server/auth/resolve-user-request', () => ({
  resolveUserRequest: dependencyMocks.resolveUserRequest,
}))
vi.mock('src/server/calendar/runtime', () => ({
  getCalendarService: dependencyMocks.getCalendarService,
}))

import {GET} from '../events'

const createEvent = (query: string): APIEvent =>
  ({request: new Request(`https://www.pomofi.io/api/calendar/events?${query}`)}) as APIEvent

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.resolveUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})
  dependencyMocks.getCalendarService.mockReturnValue({listEvents: dependencyMocks.listEvents})
  dependencyMocks.listEvents.mockResolvedValue({
    connectedConnections: 0,
    events: [],
    truncated: false,
    unavailableConnections: 0,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should require a user session', async () => {
  dependencyMocks.resolveUserRequest.mockResolvedValue({
    cookies: ['session=refreshed'],
    userId: null,
  })

  const response = await GET(
    createEvent(
      'start=2026-09-04T00%3A00%3A00.000Z&end=2026-09-05T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(response.status).toBe(401)
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
})

it('should reject reversed or unbounded query ranges', async () => {
  const reversed = await GET(
    createEvent(
      'start=2026-09-05T00%3A00%3A00.000Z&end=2026-09-04T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )
  const unbounded = await GET(
    createEvent(
      'start=2026-09-01T00%3A00%3A00.000Z&end=2026-11-01T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(reversed.status).toBe(400)
  expect(unbounded.status).toBe(400)
  expect(dependencyMocks.listEvents).not.toHaveBeenCalled()
})

it('should reject an invalid display time zone', async () => {
  const response = await GET(
    createEvent(
      'start=2026-09-04T00%3A00%3A00.000Z&end=2026-09-05T00%3A00%3A00.000Z&timeZone=Invalid%2FTimeZone',
    ),
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({error: 'invalid_calendar_range'})
  expect(dependencyMocks.listEvents).not.toHaveBeenCalled()
})

it('should allow a 31-day calendar month across a daylight-saving transition', async () => {
  const response = await GET(
    createEvent(
      'start=2026-10-01T04%3A00%3A00.000Z&end=2026-11-01T05%3A00%3A00.000Z&timeZone=America%2FNew_York',
    ),
  )

  expect(response.status).toBe(200)
  expect(dependencyMocks.listEvents).toHaveBeenCalledTimes(1)
})

it('should return normalized events for the authenticated user', async () => {
  dependencyMocks.listEvents.mockResolvedValue({
    connectedConnections: 2,
    events: [{id: 'event-1'}],
    truncated: false,
    unavailableConnections: 1,
  })
  const response = await GET(
    createEvent(
      'start=2026-09-04T00%3A00%3A00.000Z&end=2026-09-05T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    connectedConnections: 2,
    events: [{id: 'event-1'}],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 1,
  })
  expect(dependencyMocks.listEvents).toHaveBeenCalledWith({
    displayTimeZone: 'Asia/Seoul',
    end: '2026-09-05T00:00:00.000Z',
    start: '2026-09-04T00:00:00.000Z',
    userId: 'user-1',
  })
})

it('should return service unavailable when the calendar service fails', async () => {
  dependencyMocks.listEvents.mockRejectedValue(new Error('calendar unavailable'))
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const response = await GET(
    createEvent(
      'start=2026-09-04T00%3A00%3A00.000Z&end=2026-09-05T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({error: 'calendar_unavailable'})
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to list connected calendar events',
    expect.any(Error),
  )
})

it('should normalize Microsoft all-day events using the requested display time zone', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({value: [{id: 'work', name: '업무'}]}))
    .mockResolvedValueOnce(
      Response.json({
        value: [
          {
            end: {dateTime: '2026-09-05T15:00:00.0000000', timeZone: 'UTC'},
            id: 'all-day',
            isAllDay: true,
            start: {dateTime: '2026-09-04T15:00:00.0000000', timeZone: 'UTC'},
            subject: '종일 일정',
          },
        ],
      }),
    )
  const provider = createMicrosoftCalendarProvider({
    clientId: 'client',
    clientSecret: 'secret',
    fetch,
  })
  const listEvents = vi.spyOn(provider, 'listEvents')
  const repository: CalendarRepository = {
    consumeOauthState: vi.fn(),
    createOauthState: vi.fn(),
    deleteConnection: vi.fn(),
    listConnections: vi.fn(),
    saveConnection: vi.fn(),
    withLockedTokens: vi.fn(),
  }
  vi.mocked(repository.listConnections).mockResolvedValue([
    {
      accountLabel: 'work@example.com',
      encryptedTokens: 'sealed',
      id: 'connection-1',
      provider: 'microsoft',
    },
  ])
  const vault: TokenVault = {open: vi.fn(), seal: vi.fn(() => 'sealed')}
  vi.mocked(vault.open).mockReturnValue({
    accessToken: 'access',
    expiresAt: null,
    refreshToken: null,
  })
  const service = createCalendarService({providerFor: () => provider, repository, vault})
  dependencyMocks.getCalendarService.mockReturnValue(service)

  const response = await GET(
    createEvent(
      'start=2026-09-04T00%3A00%3A00.000Z&end=2026-09-08T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    connectedConnections: 1,
    events: [
      {
        accountLabel: 'work@example.com',
        allDay: true,
        calendarLabel: '업무',
        end: '2026-09-06',
        id: 'connection-1:all-day',
        provider: 'microsoft',
        start: '2026-09-05',
        title: '종일 일정',
      },
    ],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })
  expect(listEvents).toHaveBeenCalledWith({
    accessToken: 'access',
    displayTimeZone: 'Asia/Seoul',
    end: '2026-09-08T00:00:00.000Z',
    start: '2026-09-04T00:00:00.000Z',
  })
})

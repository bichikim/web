/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createMicrosoftCalendarProvider} from '../microsoft'

it.each([100, 101])(
  'should report calendar truncation only when %i calendars exceed the limit',
  async (count) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({
          value: Array.from({length: count}, (_, index) => ({id: String(index), name: 'Calendar'})),
        }),
      )
      .mockImplementation(async () => Response.json({value: []}))
    const provider = createMicrosoftCalendarProvider({
      clientId: 'client',
      clientSecret: 'secret',
      fetch,
    })
    const result = await provider.listEvents({
      accessToken: 'access',
      displayTimeZone: 'UTC',
      end: '2026-10-01T00:00:00.000Z',
      start: '2026-09-01T00:00:00.000Z',
    })
    expect(result.truncated).toBe(count > 100)
    expect(fetch).toHaveBeenCalledTimes(101)
  },
)

it.each([false, true])(
  'should report whether events remain after the final allowed page: %s',
  async (hasMore) => {
    let page = 0
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({value: [{id: 'calendar', name: 'Calendar'}]}))
      .mockImplementation(async () => {
        page += 1
        return Response.json({
          '@odata.nextLink':
            page < 20 || hasMore
              ? 'https://graph.microsoft.com/v1.0/me/calendars/calendar/calendarView?$skiptoken=next'
              : undefined,
          value: Array.from({length: 250}, (_, index) => ({
            end: {dateTime: '2026-09-06T00:00:00', timeZone: 'UTC'},
            id: `event-${page}-${index}`,
            isAllDay: true,
            start: {dateTime: '2026-09-05T00:00:00', timeZone: 'UTC'},
          })),
        })
      })
    const provider = createMicrosoftCalendarProvider({
      clientId: 'client',
      clientSecret: 'secret',
      fetch,
    })
    const result = await provider.listEvents({
      accessToken: 'access',
      displayTimeZone: 'UTC',
      end: '2026-10-01T00:00:00.000Z',
      start: '2026-09-01T00:00:00.000Z',
    })
    expect(result.truncated).toBe(hasMore)
    expect(result.events).toHaveLength(5000)
    expect(fetch).toHaveBeenCalledTimes(21)
  },
)

it.each(['complete', 'page'] as const)(
  'should retain readable Microsoft events when a sibling calendar %s fails',
  async (failureMode) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/me/calendars')) {
        return Response.json({
          value: [
            {id: 'readable', name: 'Readable'},
            {id: 'unavailable', name: 'Unavailable'},
          ],
        })
      }
      if (url.pathname.includes('/calendars/readable/calendarView')) {
        return Response.json({
          value: [
            {
              end: {dateTime: '2026-09-05T00:00:00', timeZone: 'UTC'},
              id: 'readable-event',
              isAllDay: true,
              start: {dateTime: '2026-09-04T00:00:00', timeZone: 'UTC'},
            },
          ],
        })
      }
      if (failureMode === 'page' && !url.searchParams.has('$skiptoken')) {
        return Response.json({
          '@odata.nextLink':
            'https://graph.microsoft.com/v1.0/me/calendars/unavailable/calendarView?$skiptoken=next',
          value: [
            {
              end: {dateTime: '2026-09-07T00:00:00', timeZone: 'UTC'},
              id: 'partial-event',
              isAllDay: true,
              start: {dateTime: '2026-09-06T00:00:00', timeZone: 'UTC'},
            },
          ],
        })
      }
      return Response.json({error: {code: 'ErrorAccessDenied'}}, {status: 403})
    })
    const provider = createMicrosoftCalendarProvider({
      clientId: 'client',
      clientSecret: 'secret',
      fetch,
    })

    const result = await provider.listEvents({
      accessToken: 'access',
      displayTimeZone: 'UTC',
      end: '2026-09-08T00:00:00.000Z',
      start: '2026-09-03T00:00:00.000Z',
    })

    expect(result.events.map((event) => event.id)).toEqual(
      failureMode === 'page' ? ['readable-event', 'partial-event'] : ['readable-event'],
    )
    expect(result.truncated).toBe(false)
    expect(result.unavailableCalendars).toBe(1)
  },
)

it('should create a Microsoft read-only authorization request with offline access and PKCE', () => {
  const provider = createMicrosoftCalendarProvider({
    clientId: 'microsoft-client',
    clientSecret: 'microsoft-secret',
  })
  const url = new URL(
    provider.createAuthorizationUrl({
      codeChallenge: 'challenge',
      redirectUri: 'https://pomofi.io/api/calendar/callback/microsoft',
      state: 'state-token',
    }),
  )

  expect(url.origin).toBe('https://login.microsoftonline.com')
  expect(url.searchParams.get('scope')).toContain('offline_access')
  expect(url.searchParams.get('scope')).toContain('Calendars.Read')
  expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  expect(url.searchParams.get('state')).toBe('state-token')
})

it('should exchange a Microsoft code and read the connected account', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json({
        access_token: 'access',
        expires_in: 3600,
        refresh_token: 'refresh',
      }),
    )
    .mockResolvedValueOnce(
      Response.json({displayName: 'Person', id: 'microsoft-subject', mail: null}),
    )
  const provider = createMicrosoftCalendarProvider({
    clientId: 'microsoft-client',
    clientSecret: 'microsoft-secret',
    fetch,
    now: () => new Date('2026-09-04T10:00:00.000Z'),
  })

  await expect(
    provider.exchangeCode({
      code: 'code',
      codeVerifier: 'verifier',
      redirectUri: 'https://pomofi.io/api/calendar/callback/microsoft',
    }),
  ).resolves.toEqual({
    accessToken: 'access',
    expiresAt: '2026-09-04T11:00:00.000Z',
    refreshToken: 'refresh',
  })
  await expect(provider.readAccount('access')).resolves.toEqual({
    label: 'Person',
    subject: 'microsoft-subject',
  })
})

it('should use calendarView to expand occurrences and normalize UTC values', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({value: [{id: 'work', name: '업무'}]}))
    .mockResolvedValueOnce(
      Response.json({
        '@odata.nextLink':
          'https://graph.microsoft.com/v1.0/me/calendars/work/calendarView?$skiptoken=next',
        value: [
          {
            end: {dateTime: '2026-09-05T01:00:00.0000000', timeZone: 'UTC'},
            id: 'event-1',
            isAllDay: false,
            start: {dateTime: '2026-09-05T00:00:00.0000000', timeZone: 'UTC'},
            subject: '회의',
          },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        value: [
          {
            end: {dateTime: '2026-09-06T01:00:00.0000000', timeZone: 'UTC'},
            id: 'event-2',
            isAllDay: false,
            start: {dateTime: '2026-09-06T00:00:00.0000000', timeZone: 'UTC'},
            subject: '후속 회의',
          },
        ],
      }),
    )
  const provider = createMicrosoftCalendarProvider({
    clientId: 'microsoft-client',
    clientSecret: 'microsoft-secret',
    fetch,
  })

  await expect(
    provider.listEvents({
      accessToken: 'access',
      displayTimeZone: 'UTC',
      end: '2026-09-08T00:00:00.000Z',
      start: '2026-09-04T00:00:00.000Z',
    }),
  ).resolves.toEqual({
    events: [
      {
        allDay: false,
        calendarLabel: '업무',
        end: '2026-09-05T01:00:00.000Z',
        id: 'event-1',
        start: '2026-09-05T00:00:00.000Z',
        title: '회의',
      },
      {
        allDay: false,
        calendarLabel: '업무',
        end: '2026-09-06T01:00:00.000Z',
        id: 'event-2',
        start: '2026-09-06T00:00:00.000Z',
        title: '후속 회의',
      },
    ],
    truncated: false,
    unavailableCalendars: 0,
  })

  const requestUrl = new URL(String(fetch.mock.calls[1]?.[0]))
  expect(requestUrl.pathname).toBe('/v1.0/me/calendars/work/calendarView')
  expect(requestUrl.searchParams.get('startDateTime')).toBe('2026-09-04T00:00:00.000Z')
  expect(requestUrl.searchParams.get('endDateTime')).toBe('2026-09-08T00:00:00.000Z')
  expect(fetch.mock.calls[1]?.[1]?.headers).toEqual(
    expect.objectContaining({Authorization: 'Bearer access', Prefer: 'outlook.timezone="UTC"'}),
  )
  expect(String(fetch.mock.calls[2]?.[0])).toBe(
    'https://graph.microsoft.com/v1.0/me/calendars/work/calendarView?$skiptoken=next',
  )
})

it('should page through every Microsoft calendar before loading events', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json({
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/calendars?$skiptoken=next',
        value: [{id: 'work', name: '업무'}],
      }),
    )
    .mockResolvedValueOnce(Response.json({value: [{id: 'personal', name: '개인'}]}))
    .mockResolvedValueOnce(Response.json({value: []}))
    .mockResolvedValueOnce(Response.json({value: []}))
  const provider = createMicrosoftCalendarProvider({
    clientId: 'microsoft-client',
    clientSecret: 'microsoft-secret',
    fetch,
  })

  await provider.listEvents({
    accessToken: 'access',
    displayTimeZone: 'UTC',
    end: '2026-09-08T00:00:00.000Z',
    start: '2026-09-04T00:00:00.000Z',
  })

  expect(String(fetch.mock.calls[1]?.[0])).toBe(
    'https://graph.microsoft.com/v1.0/me/calendars?$skiptoken=next',
  )
  expect(new URL(String(fetch.mock.calls[2]?.[0])).pathname).toContain(
    '/calendars/work/calendarView',
  )
  expect(new URL(String(fetch.mock.calls[3]?.[0])).pathname).toContain(
    '/calendars/personal/calendarView',
  )
})

it('should preserve civil dates from non-UTC all-day payloads', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({value: [{id: 'work', name: '업무'}]}))
    .mockResolvedValueOnce(
      Response.json({
        value: [
          {
            end: {dateTime: '2026-09-06T00:00:00.0000000', timeZone: 'Pacific Standard Time'},
            id: 'all-day',
            isAllDay: true,
            start: {dateTime: '2026-09-05T00:00:00.0000000', timeZone: 'Pacific Standard Time'},
          },
        ],
      }),
    )
  const provider = createMicrosoftCalendarProvider({
    clientId: 'client',
    clientSecret: 'secret',
    fetch,
  })

  await expect(
    provider.listEvents({
      accessToken: 'access',
      displayTimeZone: 'America/Los_Angeles',
      end: '2026-09-08T00:00:00.000Z',
      start: '2026-09-04T00:00:00.000Z',
    }),
  ).resolves.toMatchObject({
    events: [{allDay: true, end: '2026-09-06', id: 'all-day', start: '2026-09-05'}],
  })
})

it('should reject an invalid display time zone before requesting calendars', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const provider = createMicrosoftCalendarProvider({
    clientId: 'client',
    clientSecret: 'secret',
    fetch,
  })

  await expect(
    provider.listEvents({
      accessToken: 'access',
      displayTimeZone: 'Invalid/TimeZone',
      end: '2026-09-08T00:00:00.000Z',
      start: '2026-09-04T00:00:00.000Z',
    }),
  ).rejects.toThrow(RangeError)
  expect(fetch).not.toHaveBeenCalled()
})

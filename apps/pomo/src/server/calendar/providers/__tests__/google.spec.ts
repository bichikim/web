import {expect, it, vi} from 'vitest'

import {createGoogleCalendarProvider} from '../google'

it.each([100, 101])(
  'should report calendar truncation only when %i calendars exceed the limit',
  async (count) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({
          items: Array.from({length: count}, (_, index) => ({
            id: String(index),
            summary: 'Calendar',
          })),
        }),
      )
      .mockImplementation(async () => Response.json({items: []}))
    const provider = createGoogleCalendarProvider({
      clientId: 'client',
      clientSecret: 'secret',
      fetch,
    })
    const result = await provider.listEvents({
      accessToken: 'access',
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
      .mockResolvedValueOnce(Response.json({items: [{id: 'calendar', summary: 'Calendar'}]}))
      .mockImplementation(async () => {
        page += 1
        return Response.json({
          items: Array.from({length: 250}, (_, index) => ({
            end: {date: '2026-09-06'},
            id: `event-${page}-${index}`,
            start: {date: '2026-09-05'},
          })),
          nextPageToken: page < 20 || hasMore ? 'next-page' : undefined,
        })
      })
    const provider = createGoogleCalendarProvider({
      clientId: 'client',
      clientSecret: 'secret',
      fetch,
    })
    const result = await provider.listEvents({
      accessToken: 'access',
      end: '2026-10-01T00:00:00.000Z',
      start: '2026-09-01T00:00:00.000Z',
    })
    expect(result.truncated).toBe(hasMore)
    expect(result.events).toHaveLength(5000)
    expect(fetch).toHaveBeenCalledTimes(21)
  },
)

it('should create a Google offline read-only authorization request with PKCE', () => {
  const provider = createGoogleCalendarProvider({
    clientId: 'google-client',
    clientSecret: 'google-secret',
  })
  const url = new URL(
    provider.createAuthorizationUrl({
      codeChallenge: 'challenge',
      redirectUri: 'https://pomofi.io/api/calendar/callback/google',
      state: 'state-token',
    }),
  )

  expect(url.origin).toBe('https://accounts.google.com')
  expect(url.searchParams.get('access_type')).toBe('offline')
  expect(url.searchParams.get('prompt')).toBe('consent')
  expect(url.searchParams.get('scope')).toContain(
    'https://www.googleapis.com/auth/calendar.readonly',
  )
  expect(url.searchParams.get('code_challenge')).toBe('challenge')
  expect(url.searchParams.get('state')).toBe('state-token')
})

it('should exchange a Google code and read the connected account', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json({
        access_token: 'access',
        expires_in: 3600,
        refresh_token: 'refresh',
      }),
    )
    .mockResolvedValueOnce(Response.json({email: 'person@example.com', sub: 'google-subject'}))
  const provider = createGoogleCalendarProvider({
    clientId: 'google-client',
    clientSecret: 'google-secret',
    fetch,
    now: () => new Date('2026-09-04T10:00:00.000Z'),
  })

  await expect(
    provider.exchangeCode({
      code: 'code',
      codeVerifier: 'verifier',
      redirectUri: 'https://pomofi.io/api/calendar/callback/google',
    }),
  ).resolves.toEqual({
    accessToken: 'access',
    expiresAt: '2026-09-04T11:00:00.000Z',
    refreshToken: 'refresh',
  })
  await expect(provider.readAccount('access')).resolves.toEqual({
    label: 'person@example.com',
    subject: 'google-subject',
  })
})

it('should expand recurring Google events and normalize timed and all-day values', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({items: [{id: 'work', summary: '업무'}]}))
    .mockResolvedValueOnce(
      Response.json({
        items: [
          {
            end: {dateTime: '2026-09-05T10:00:00+09:00'},
            id: 'timed',
            start: {dateTime: '2026-09-05T09:00:00+09:00'},
            summary: '회의',
          },
        ],
        nextPageToken: 'next-events',
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        items: [
          {
            end: {date: '2026-09-07'},
            id: 'all-day',
            start: {date: '2026-09-06'},
          },
        ],
      }),
    )
  const provider = createGoogleCalendarProvider({
    clientId: 'google-client',
    clientSecret: 'google-secret',
    fetch,
  })

  await expect(
    provider.listEvents({
      accessToken: 'access',
      end: '2026-09-08T00:00:00.000Z',
      start: '2026-09-04T00:00:00.000Z',
    }),
  ).resolves.toEqual({
    events: [
      {
        allDay: false,
        calendarLabel: '업무',
        end: '2026-09-05T01:00:00.000Z',
        id: 'timed',
        start: '2026-09-05T00:00:00.000Z',
        title: '회의',
      },
      {
        allDay: true,
        calendarLabel: '업무',
        end: '2026-09-07',
        id: 'all-day',
        start: '2026-09-06',
        title: '제목 없는 일정',
      },
    ],
    truncated: false,
  })

  const requestUrl = new URL(String(fetch.mock.calls[1]?.[0]))
  expect(requestUrl.pathname).toBe('/calendar/v3/calendars/work/events')
  expect(requestUrl.searchParams.get('singleEvents')).toBe('true')
  expect(requestUrl.searchParams.get('orderBy')).toBe('startTime')
  expect(requestUrl.searchParams.get('timeMin')).toBe('2026-09-04T00:00:00.000Z')
  expect(requestUrl.searchParams.get('timeMax')).toBe('2026-09-08T00:00:00.000Z')
  expect(new URL(String(fetch.mock.calls[2]?.[0])).searchParams.get('pageToken')).toBe(
    'next-events',
  )
})

it('should page through every Google calendar before loading events', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json({
        items: [{id: 'work', summary: '업무'}],
        nextPageToken: 'next-calendars',
      }),
    )
    .mockResolvedValueOnce(Response.json({items: [{id: 'personal', summary: '개인'}]}))
    .mockResolvedValueOnce(Response.json({items: []}))
    .mockResolvedValueOnce(Response.json({items: []}))
  const provider = createGoogleCalendarProvider({
    clientId: 'google-client',
    clientSecret: 'google-secret',
    fetch,
  })

  await provider.listEvents({
    accessToken: 'access',
    end: '2026-09-08T00:00:00.000Z',
    start: '2026-09-04T00:00:00.000Z',
  })

  expect(new URL(String(fetch.mock.calls[1]?.[0])).searchParams.get('pageToken')).toBe(
    'next-calendars',
  )
  expect(new URL(String(fetch.mock.calls[2]?.[0])).pathname).toContain('/calendars/work/events')
  expect(new URL(String(fetch.mock.calls[3]?.[0])).pathname).toContain('/calendars/personal/events')
})

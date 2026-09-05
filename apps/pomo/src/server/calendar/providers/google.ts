import {z} from 'zod'

import type {
  CalendarProvider,
  CreateCalendarProviderOptions,
  ListProviderEventsOptions,
  ProviderEvent,
  ProviderEventsResult,
} from './types'
import {mapInBatches} from './batch'
import {requestTokens} from './oauth'

const GOOGLE_ACCOUNT_API = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'].join(
  ' ',
)
const EVENT_PAGE_SIZE = 250
const MAXIMUM_EVENT_PAGES = 20
const MAXIMUM_EVENTS_PER_CALENDAR = EVENT_PAGE_SIZE * MAXIMUM_EVENT_PAGES
const CALENDAR_PAGE_SIZE = 250
const MAXIMUM_CALENDAR_PAGES = 20
const MAXIMUM_CALENDARS = 100
const EVENT_REQUEST_CONCURRENCY = 4
const googleEventSchema = z.object({
  end: z.object({date: z.string().optional(), dateTime: z.string().optional()}),
  id: z.string(),
  start: z.object({date: z.string().optional(), dateTime: z.string().optional()}),
  status: z.string().optional(),
  summary: z.string().optional(),
})
const googleEventsSchema = z.object({
  items: z.array(googleEventSchema).default([]),
  nextPageToken: z.string().min(1).optional(),
})
const googleCalendarsSchema = z.object({
  items: z.array(z.object({id: z.string(), summary: z.string()})).default([]),
  nextPageToken: z.string().min(1).optional(),
})
const googleAccountSchema = z.object({email: z.string().email(), sub: z.string().min(1)})

const normalizeEvent = (
  event: z.infer<typeof googleEventSchema>,
  calendarLabel: string,
): ProviderEvent | null => {
  if (event.status === 'cancelled') {
    return null
  }

  if (event.start.date !== undefined && event.end.date !== undefined) {
    return {
      allDay: true,
      calendarLabel,
      end: event.end.date,
      id: event.id,
      start: event.start.date,
      title: event.summary?.trim() || '제목 없는 일정',
    }
  }

  if (event.start.dateTime === undefined || event.end.dateTime === undefined) {
    return null
  }

  return {
    allDay: false,
    calendarLabel,
    end: new Date(event.end.dateTime).toISOString(),
    id: event.id,
    start: new Date(event.start.dateTime).toISOString(),
    title: event.summary?.trim() || '제목 없는 일정',
  }
}

const listCalendarEvents = async (
  calendarId: string,
  calendarLabel: string,
  options: ListProviderEventsOptions,
  fetch: typeof globalThis.fetch,
): Promise<ProviderEventsResult> => {
  const events: Array<ProviderEvent> = []
  let truncated = false
  const headers = {Authorization: `Bearer ${options.accessToken}`}
  const loadPage = async (pageToken: string | null, pageCount: number): Promise<void> => {
    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set('maxResults', String(EVENT_PAGE_SIZE))
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('showDeleted', 'false')
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('timeMax', options.end)
    url.searchParams.set('timeMin', options.start)
    if (pageToken !== null) {
      url.searchParams.set('pageToken', pageToken)
    }
    const response = await fetch(url, {headers})

    if (!response.ok) {
      throw new Error(`Google Calendar events request failed with status ${response.status}`)
    }

    const body = googleEventsSchema.parse(await response.json())
    const normalizedEvents = body.items.flatMap((event) => {
      const normalized = normalizeEvent(event, calendarLabel)
      return normalized === null ? [] : [normalized]
    })
    const remainingEvents = MAXIMUM_EVENTS_PER_CALENDAR - events.length
    truncated = normalizedEvents.length > remainingEvents
    events.push(...normalizedEvents.slice(0, remainingEvents))
    const nextPageToken = body.nextPageToken ?? null
    truncated ||= nextPageToken !== null
    if (
      nextPageToken !== null &&
      pageCount + 1 < MAXIMUM_EVENT_PAGES &&
      events.length < MAXIMUM_EVENTS_PER_CALENDAR
    ) {
      await loadPage(nextPageToken, pageCount + 1)
    }
  }

  await loadPage(null, 0)

  return {events, truncated}
}

interface CalendarListResult {
  readonly calendars: ReadonlyArray<z.infer<typeof googleCalendarsSchema>['items'][number]>
  readonly truncated: boolean
}

const listCalendars = async (
  accessToken: string,
  fetch: typeof globalThis.fetch,
): Promise<CalendarListResult> => {
  const calendars: Array<z.infer<typeof googleCalendarsSchema>['items'][number]> = []
  let truncated = false
  const headers = {Authorization: `Bearer ${accessToken}`}
  const loadPage = async (pageToken: string | null, pageCount: number): Promise<void> => {
    const url = new URL(`${GOOGLE_CALENDAR_API}/users/me/calendarList`)
    url.searchParams.set('maxResults', String(CALENDAR_PAGE_SIZE))
    if (pageToken !== null) {
      url.searchParams.set('pageToken', pageToken)
    }
    const response = await fetch(url, {headers})

    if (!response.ok) {
      throw new Error(`Google Calendar list request failed with status ${response.status}`)
    }

    const body = googleCalendarsSchema.parse(await response.json())
    truncated = body.items.length > MAXIMUM_CALENDARS - calendars.length
    calendars.push(...body.items.slice(0, MAXIMUM_CALENDARS - calendars.length))
    const nextPageToken = body.nextPageToken ?? null
    truncated ||= nextPageToken !== null
    if (
      nextPageToken !== null &&
      pageCount + 1 < MAXIMUM_CALENDAR_PAGES &&
      calendars.length < MAXIMUM_CALENDARS
    ) {
      await loadPage(nextPageToken, pageCount + 1)
    }
  }

  await loadPage(null, 0)

  return {calendars, truncated}
}

const listEvents = async (
  options: ListProviderEventsOptions,
  fetch: typeof globalThis.fetch,
): Promise<ProviderEventsResult> => {
  const result = await listCalendars(options.accessToken, fetch)
  const eventLists = await mapInBatches(result.calendars, EVENT_REQUEST_CONCURRENCY, (calendar) =>
    listCalendarEvents(calendar.id, calendar.summary, options, fetch),
  )
  return {
    events: eventLists.flatMap((result) => result.events),
    truncated: result.truncated || eventLists.some((result) => result.truncated),
  }
}

export const createGoogleCalendarProvider = (
  options: CreateCalendarProviderOptions,
): CalendarProvider => {
  const fetch = options.fetch ?? globalThis.fetch
  const now = options.now ?? (() => new Date())
  const createTokenBody = () =>
    new URLSearchParams([
      ['client_id', options.clientId],
      ['client_secret', options.clientSecret],
    ])

  return {
    createAuthorizationUrl: (authorizationOptions) => {
      const url = new URL(GOOGLE_AUTHORIZATION_URL)
      url.search = new URLSearchParams([
        ['access_type', 'offline'],
        ['client_id', options.clientId],
        ['code_challenge', authorizationOptions.codeChallenge],
        ['code_challenge_method', 'S256'],
        ['include_granted_scopes', 'true'],
        ['prompt', 'consent'],
        ['redirect_uri', authorizationOptions.redirectUri],
        ['response_type', 'code'],
        ['scope', GOOGLE_SCOPES],
        ['state', authorizationOptions.state],
      ]).toString()
      return url.href
    },
    exchangeCode: (exchangeOptions) => {
      const body = createTokenBody()
      body.set('code', exchangeOptions.code)
      body.set('code_verifier', exchangeOptions.codeVerifier)
      body.set('grant_type', 'authorization_code')
      body.set('redirect_uri', exchangeOptions.redirectUri)
      return requestTokens({body, fetch, now, tokenUrl: GOOGLE_TOKEN_URL})
    },
    listEvents: (query) => listEvents(query, fetch),
    provider: 'google',
    readAccount: async (accessToken) => {
      const response = await fetch(GOOGLE_ACCOUNT_API, {
        headers: {Authorization: `Bearer ${accessToken}`},
      })

      if (!response.ok) {
        throw new Error(`Google account request failed with status ${response.status}`)
      }

      const account = googleAccountSchema.parse(await response.json())
      return {label: account.email, subject: account.sub}
    },
    refreshTokens: async (refreshToken) => {
      const body = createTokenBody()
      body.set('grant_type', 'refresh_token')
      body.set('refresh_token', refreshToken)
      const tokens = await requestTokens({body, fetch, now, tokenUrl: GOOGLE_TOKEN_URL})
      return {...tokens, refreshToken: tokens.refreshToken ?? refreshToken}
    },
  }
}

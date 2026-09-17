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
import {paginate, PAGINATION_LIMITS} from './paginate'

const GOOGLE_ACCOUNT_API = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'].join(
  ' ',
)
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
  calendarId: string,
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
      id: JSON.stringify([calendarId, event.id]),
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
    id: JSON.stringify([calendarId, event.id]),
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
  const headers = {Authorization: `Bearer ${options.accessToken}`}
  const result = await paginate<ProviderEvent, string>({
    loadPage: async (pageToken) => {
      const url = new URL(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      )
      url.searchParams.set('maxResults', String(PAGINATION_LIMITS.events.pageSize))
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
      const items = body.items.flatMap((event) => {
        const normalized = normalizeEvent(event, calendarId, calendarLabel)
        return normalized === null ? [] : [normalized]
      })
      return {items, nextCursor: body.nextPageToken ?? null}
    },
    maximumItems: PAGINATION_LIMITS.events.maximumItems,
    maximumPages: PAGINATION_LIMITS.events.maximumPages,
  })

  return {events: result.items, truncated: result.truncated}
}

interface CalendarListResult {
  readonly calendars: ReadonlyArray<z.infer<typeof googleCalendarsSchema>['items'][number]>
  readonly truncated: boolean
}

const listCalendars = async (
  accessToken: string,
  fetch: typeof globalThis.fetch,
): Promise<CalendarListResult> => {
  const headers = {Authorization: `Bearer ${accessToken}`}
  const result = await paginate<z.infer<typeof googleCalendarsSchema>['items'][number], string>({
    loadPage: async (pageToken) => {
      const url = new URL(`${GOOGLE_CALENDAR_API}/users/me/calendarList`)
      url.searchParams.set('maxResults', String(PAGINATION_LIMITS.calendars.pageSize))
      if (pageToken !== null) {
        url.searchParams.set('pageToken', pageToken)
      }
      const response = await fetch(url, {headers})

      if (!response.ok) {
        throw new Error(`Google Calendar list request failed with status ${response.status}`)
      }

      const body = googleCalendarsSchema.parse(await response.json())
      return {items: body.items, nextCursor: body.nextPageToken ?? null}
    },
    maximumItems: PAGINATION_LIMITS.calendars.maximumItems,
    maximumPages: PAGINATION_LIMITS.calendars.maximumPages,
  })

  return {calendars: result.items, truncated: result.truncated}
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

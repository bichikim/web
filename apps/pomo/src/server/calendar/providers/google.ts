import {z} from 'zod'

import type {
  CalendarProvider,
  CreateCalendarProviderOptions,
  ListProviderEventsOptions,
  ProviderEvent,
  ProviderEventsResult,
} from './types'
import {aggregateProviderEvents} from './aggregate-provider-events'
import {listPaginatedEvents} from './list-paginated-events'
import {createOAuthTokenMethods} from './create-oauth-token-methods'
import {paginate, PAGINATION_LIMITS} from './paginate'
import {isValidTimeZone} from 'src/utils/is-valid-time-zone'

const GOOGLE_ACCOUNT_API = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'].join(
  ' ',
)
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
  items: z
    .array(z.object({id: z.string(), summary: z.string(), timeZone: z.string().optional()}))
    .default([]),
  nextPageToken: z.string().min(1).optional(),
})
const googleAccountSchema = z.object({email: z.string().email(), sub: z.string().min(1)})

const normalizeEvent = (
  event: z.infer<typeof googleEventSchema>,
  calendarId: string,
  calendarLabel: string,
  calendarTimeZone?: string,
): ProviderEvent | null => {
  if (event.status === 'cancelled') {
    return null
  }

  if (event.start.date !== undefined && event.end.date !== undefined) {
    return {
      allDay: true,
      ...(calendarTimeZone === undefined ? {} : {calendarTimeZone}),
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

interface ListCalendarEventsOptions extends ListProviderEventsOptions {
  readonly calendarId: string
  readonly calendarLabel: string
  readonly calendarTimeZone?: string
  readonly fetch: typeof globalThis.fetch
}

const listCalendarEvents = async ({
  calendarId,
  calendarLabel,
  calendarTimeZone,
  fetch,
  ...options
}: ListCalendarEventsOptions): Promise<ProviderEventsResult> => {
  const headers = {Authorization: `Bearer ${options.accessToken}`}
  return listPaginatedEvents<string>(async (pageToken) => {
    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`)
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
      const normalized = normalizeEvent(event, calendarId, calendarLabel, calendarTimeZone)
      return normalized === null ? [] : [normalized]
    })
    return {items, nextCursor: body.nextPageToken ?? null}
  })
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
  const calendarList = await listCalendars(options.accessToken, fetch)
  return aggregateProviderEvents({
    calendars: calendarList.calendars,
    load: (calendar) => {
      const calendarTimeZone =
        options.lookupInstant === undefined
          ? undefined
          : calendar.timeZone !== undefined && isValidTimeZone(calendar.timeZone)
            ? calendar.timeZone
            : options.displayTimeZone
      return listCalendarEvents({
        ...options,
        calendarId: calendar.id,
        calendarLabel: calendar.summary,
        calendarTimeZone,
        fetch,
      })
    },
    truncated: calendarList.truncated,
  })
}

export const createGoogleCalendarProvider = (
  options: CreateCalendarProviderOptions,
): CalendarProvider => {
  const fetch = options.fetch ?? globalThis.fetch
  const now = options.now ?? (() => new Date())

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
    ...createOAuthTokenMethods({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      fetch,
      now,
      tokenUrl: GOOGLE_TOKEN_URL,
    }),
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
  }
}

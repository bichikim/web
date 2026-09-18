import {z} from 'zod'

import type {
  CalendarProvider,
  CreateCalendarProviderOptions,
  ListProviderEventsOptions,
  ProviderEvent,
  ProviderEventsResult,
} from './types'
import {mapInBatches} from './batch'
import {formatCalendarDate} from './format-calendar-date'
import {requestTokens} from './oauth'
import {paginate, PAGINATION_LIMITS} from './paginate'

const MICROSOFT_ACCOUNT_API =
  'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName'
const MICROSOFT_AUTHORIZATION_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const MICROSOFT_SCOPES = ['openid', 'email', 'offline_access', 'User.Read', 'Calendars.Read'].join(
  ' ',
)
const EVENT_REQUEST_CONCURRENCY = 4
const CALENDAR_DATE_LENGTH = 10
const graphDateTimeSchema = z.object({dateTime: z.string(), timeZone: z.string()})
const graphEventSchema = z.object({
  end: graphDateTimeSchema,
  id: z.string(),
  isAllDay: z.boolean(),
  isCancelled: z.boolean().optional(),
  start: graphDateTimeSchema,
  subject: z.string().nullable().optional(),
})
const graphEventsSchema = z.object({
  '@odata.nextLink': z.url().optional(),
  value: z.array(graphEventSchema).default([]),
})
const graphCalendarsSchema = z.object({
  '@odata.nextLink': z.url().optional(),
  value: z.array(z.object({id: z.string(), name: z.string()})).default([]),
})
const microsoftAccountSchema = z.object({
  displayName: z.string().nullable().optional(),
  id: z.string().min(1),
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string().nullable().optional(),
})

const toUtcIso = (value: z.infer<typeof graphDateTimeSchema>) => {
  const dateTime =
    value.timeZone === 'UTC' && !value.dateTime.endsWith('Z')
      ? `${value.dateTime}Z`
      : value.dateTime
  return new Date(dateTime).toISOString()
}

const toDisplayCalendarDate = (
  value: z.infer<typeof graphDateTimeSchema>,
  displayTimeZoneFormatter: Intl.DateTimeFormat,
) => {
  if (value.timeZone !== 'UTC') {
    return z.iso.date().parse(value.dateTime.slice(0, CALENDAR_DATE_LENGTH))
  }

  return formatCalendarDate({date: new Date(toUtcIso(value)), formatter: displayTimeZoneFormatter})
}

const normalizeEvent = (
  event: z.infer<typeof graphEventSchema>,
  calendarLabel: string,
  displayTimeZoneFormatter: Intl.DateTimeFormat,
): ProviderEvent | null => {
  if (event.isCancelled === true) {
    return null
  }

  const start = event.isAllDay
    ? toDisplayCalendarDate(event.start, displayTimeZoneFormatter)
    : toUtcIso(event.start)
  const end = event.isAllDay
    ? toDisplayCalendarDate(event.end, displayTimeZoneFormatter)
    : toUtcIso(event.end)
  return {
    allDay: event.isAllDay,
    calendarLabel,
    end,
    id: event.id,
    start,
    title: event.subject?.trim() || '제목 없는 일정',
  }
}

const readNextUrl = (nextLink: string | undefined): URL | null => {
  if (nextLink === undefined) {
    return null
  }

  const nextUrl = new URL(nextLink)
  if (nextUrl.origin !== new URL(MICROSOFT_GRAPH_API).origin) {
    throw new Error('Microsoft Calendar pagination returned an unexpected origin')
  }
  return nextUrl
}

interface ListCalendarEventsOptions {
  readonly calendarId: string
  readonly calendarLabel: string
  readonly displayTimeZoneFormatter: Intl.DateTimeFormat
  readonly eventOptions: ListProviderEventsOptions
  readonly fetch: typeof globalThis.fetch
}

const listCalendarEvents = async ({
  calendarId,
  calendarLabel,
  displayTimeZoneFormatter,
  eventOptions,
  fetch,
}: ListCalendarEventsOptions): Promise<ProviderEventsResult> => {
  const headers = {
    Authorization: `Bearer ${eventOptions.accessToken}`,
    Prefer: 'outlook.timezone="UTC"',
  }
  const initialUrl = new URL(
    `${MICROSOFT_GRAPH_API}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`,
  )
  initialUrl.searchParams.set('$orderby', 'start/dateTime')
  initialUrl.searchParams.set('$select', 'id,subject,start,end,isAllDay,isCancelled')
  initialUrl.searchParams.set('$top', String(PAGINATION_LIMITS.events.pageSize))
  initialUrl.searchParams.set('endDateTime', eventOptions.end)
  initialUrl.searchParams.set('startDateTime', eventOptions.start)
  let unavailableCalendars = 0
  const result = await paginate<ProviderEvent, URL>({
    loadPage: async (nextUrl) => {
      try {
        const url = nextUrl ?? initialUrl
        const response = await fetch(url, {headers})
        if (!response.ok) {
          throw new Error(`Microsoft Calendar events request failed with status ${response.status}`)
        }

        const body = graphEventsSchema.parse(await response.json())
        const items = body.value.flatMap((event) => {
          const normalized = normalizeEvent(event, calendarLabel, displayTimeZoneFormatter)
          return normalized === null ? [] : [normalized]
        })
        return {items, nextCursor: readNextUrl(body['@odata.nextLink'])}
      } catch {
        unavailableCalendars = 1
        return {items: [], nextCursor: null}
      }
    },
    maximumItems: PAGINATION_LIMITS.events.maximumItems,
    maximumPages: PAGINATION_LIMITS.events.maximumPages,
  })

  return {
    events: result.items,
    truncated: unavailableCalendars === 0 && result.truncated,
    unavailableCalendars,
  }
}

interface CalendarListResult {
  readonly calendars: ReadonlyArray<z.infer<typeof graphCalendarsSchema>['value'][number]>
  readonly truncated: boolean
}

const listCalendars = async (
  accessToken: string,
  fetch: typeof globalThis.fetch,
): Promise<CalendarListResult> => {
  const headers = {Authorization: `Bearer ${accessToken}`}
  const initialUrl = new URL(`${MICROSOFT_GRAPH_API}/me/calendars`)
  initialUrl.searchParams.set('$top', String(PAGINATION_LIMITS.calendars.pageSize))
  const result = await paginate<z.infer<typeof graphCalendarsSchema>['value'][number], URL>({
    loadPage: async (nextUrl) => {
      const url = nextUrl ?? initialUrl
      const response = await fetch(url, {headers})
      if (!response.ok) {
        throw new Error(`Microsoft Calendar list request failed with status ${response.status}`)
      }

      const body = graphCalendarsSchema.parse(await response.json())
      return {items: body.value, nextCursor: readNextUrl(body['@odata.nextLink'])}
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
  const displayTimeZoneFormatter = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: options.displayTimeZone,
    year: 'numeric',
  })
  const calendarList = await listCalendars(options.accessToken, fetch)
  const eventLists = await mapInBatches(
    calendarList.calendars,
    EVENT_REQUEST_CONCURRENCY,
    (calendar) =>
      listCalendarEvents({
        calendarId: calendar.id,
        calendarLabel: calendar.name,
        displayTimeZoneFormatter,
        eventOptions: options,
        fetch,
      }),
  )
  return {
    events: eventLists.flatMap((eventList) => eventList.events),
    truncated: calendarList.truncated || eventLists.some((eventList) => eventList.truncated),
    unavailableCalendars: eventLists.reduce(
      (count, eventList) => count + eventList.unavailableCalendars,
      0,
    ),
  }
}

export const createMicrosoftCalendarProvider = (
  options: CreateCalendarProviderOptions,
): CalendarProvider => {
  const fetch = options.fetch ?? globalThis.fetch
  const now = options.now ?? (() => new Date())
  const createTokenBody = () =>
    new URLSearchParams([
      ['client_id', options.clientId],
      ['client_secret', options.clientSecret],
      ['scope', MICROSOFT_SCOPES],
    ])

  return {
    createAuthorizationUrl: (authorizationOptions) => {
      const url = new URL(MICROSOFT_AUTHORIZATION_URL)
      url.search = new URLSearchParams([
        ['client_id', options.clientId],
        ['code_challenge', authorizationOptions.codeChallenge],
        ['code_challenge_method', 'S256'],
        ['redirect_uri', authorizationOptions.redirectUri],
        ['response_mode', 'query'],
        ['response_type', 'code'],
        ['scope', MICROSOFT_SCOPES],
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
      return requestTokens({body, fetch, now, tokenUrl: MICROSOFT_TOKEN_URL})
    },
    listEvents: (query) => listEvents(query, fetch),
    provider: 'microsoft',
    readAccount: async (accessToken) => {
      const response = await fetch(MICROSOFT_ACCOUNT_API, {
        headers: {Authorization: `Bearer ${accessToken}`},
      })

      if (!response.ok) {
        throw new Error(`Microsoft account request failed with status ${response.status}`)
      }

      const account = microsoftAccountSchema.parse(await response.json())
      return {
        label:
          account.mail ?? account.userPrincipalName ?? account.displayName?.trim() ?? 'Microsoft',
        subject: account.id,
      }
    },
    refreshTokens: async (refreshToken) => {
      const body = createTokenBody()
      body.set('grant_type', 'refresh_token')
      body.set('refresh_token', refreshToken)
      const tokens = await requestTokens({body, fetch, now, tokenUrl: MICROSOFT_TOKEN_URL})
      return {...tokens, refreshToken: tokens.refreshToken ?? refreshToken}
    },
  }
}

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

const MICROSOFT_ACCOUNT_API =
  'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName'
const MICROSOFT_AUTHORIZATION_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const MICROSOFT_SCOPES = ['openid', 'email', 'offline_access', 'User.Read', 'Calendars.Read'].join(
  ' ',
)
const EVENT_PAGE_SIZE = 250
const MAXIMUM_EVENT_PAGES = 20
const MAXIMUM_EVENTS_PER_CALENDAR = EVENT_PAGE_SIZE * MAXIMUM_EVENT_PAGES
const CALENDAR_PAGE_SIZE = 250
const MAXIMUM_CALENDAR_PAGES = 20
const MAXIMUM_CALENDARS = 100
const EVENT_REQUEST_CONCURRENCY = 4
const ISO_DATE_LENGTH = 10
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

const normalizeEvent = (
  event: z.infer<typeof graphEventSchema>,
  calendarLabel: string,
): ProviderEvent | null => {
  if (event.isCancelled === true) {
    return null
  }

  const start = toUtcIso(event.start)
  const end = toUtcIso(event.end)
  return {
    allDay: event.isAllDay,
    calendarLabel,
    end: event.isAllDay ? end.slice(0, ISO_DATE_LENGTH) : end,
    id: event.id,
    start: event.isAllDay ? start.slice(0, ISO_DATE_LENGTH) : start,
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

const listCalendarEvents = async (
  calendarId: string,
  calendarLabel: string,
  options: ListProviderEventsOptions,
  fetch: typeof globalThis.fetch,
): Promise<ProviderEventsResult> => {
  const events: Array<ProviderEvent> = []
  let truncated = false
  const headers = {
    Authorization: `Bearer ${options.accessToken}`,
    Prefer: 'outlook.timezone="UTC"',
  }
  const initialUrl = new URL(
    `${MICROSOFT_GRAPH_API}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`,
  )
  initialUrl.searchParams.set('$orderby', 'start/dateTime')
  initialUrl.searchParams.set('$select', 'id,subject,start,end,isAllDay,isCancelled')
  initialUrl.searchParams.set('$top', String(EVENT_PAGE_SIZE))
  initialUrl.searchParams.set('endDateTime', options.end)
  initialUrl.searchParams.set('startDateTime', options.start)
  const loadPage = async (url: URL, pageCount: number): Promise<void> => {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      throw new Error(`Microsoft Calendar events request failed with status ${response.status}`)
    }

    const body = graphEventsSchema.parse(await response.json())
    const normalizedEvents = body.value.flatMap((event) => {
      const normalized = normalizeEvent(event, calendarLabel)
      return normalized === null ? [] : [normalized]
    })
    const remainingEvents = MAXIMUM_EVENTS_PER_CALENDAR - events.length
    truncated = normalizedEvents.length > remainingEvents
    events.push(...normalizedEvents.slice(0, remainingEvents))
    const nextUrl = readNextUrl(body['@odata.nextLink'])
    truncated ||= nextUrl !== null
    if (
      nextUrl !== null &&
      pageCount + 1 < MAXIMUM_EVENT_PAGES &&
      events.length < MAXIMUM_EVENTS_PER_CALENDAR
    ) {
      await loadPage(nextUrl, pageCount + 1)
    }
  }

  await loadPage(initialUrl, 0)

  return {events, truncated}
}

interface CalendarListResult {
  readonly calendars: ReadonlyArray<z.infer<typeof graphCalendarsSchema>['value'][number]>
  readonly truncated: boolean
}

const listCalendars = async (
  accessToken: string,
  fetch: typeof globalThis.fetch,
): Promise<CalendarListResult> => {
  const calendars: Array<z.infer<typeof graphCalendarsSchema>['value'][number]> = []
  let truncated = false
  const headers = {Authorization: `Bearer ${accessToken}`}
  const initialUrl = new URL(`${MICROSOFT_GRAPH_API}/me/calendars`)
  initialUrl.searchParams.set('$top', String(CALENDAR_PAGE_SIZE))
  const loadPage = async (url: URL, pageCount: number): Promise<void> => {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      throw new Error(`Microsoft Calendar list request failed with status ${response.status}`)
    }

    const body = graphCalendarsSchema.parse(await response.json())
    truncated = body.value.length > MAXIMUM_CALENDARS - calendars.length
    calendars.push(...body.value.slice(0, MAXIMUM_CALENDARS - calendars.length))
    const nextUrl = readNextUrl(body['@odata.nextLink'])
    truncated ||= nextUrl !== null
    if (
      nextUrl !== null &&
      pageCount + 1 < MAXIMUM_CALENDAR_PAGES &&
      calendars.length < MAXIMUM_CALENDARS
    ) {
      await loadPage(nextUrl, pageCount + 1)
    }
  }

  await loadPage(initialUrl, 0)

  return {calendars, truncated}
}

const listEvents = async (
  options: ListProviderEventsOptions,
  fetch: typeof globalThis.fetch,
): Promise<ProviderEventsResult> => {
  const result = await listCalendars(options.accessToken, fetch)
  const eventLists = await mapInBatches(result.calendars, EVENT_REQUEST_CONCURRENCY, (calendar) =>
    listCalendarEvents(calendar.id, calendar.name, options, fetch),
  )
  return {
    events: eventLists.flatMap((result) => result.events),
    truncated: result.truncated || eventLists.some((result) => result.truncated),
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

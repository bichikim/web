import {z} from 'zod'

import {apiJson, apiJsonRequest} from '../api-json'
import {readStoredAppSession} from '../user-auth/app-session'
import {createCalendarPromptContext} from './prompt'
import {createCalendarQuery} from './query'
import {CALENDAR_PROVIDERS, type CalendarEvent} from './types'

const MAXIMUM_PROMPT_EVENTS = 40

export interface CalendarConnection {
  readonly accountLabel: string
  readonly id: string
  readonly provider: (typeof CALENDAR_PROVIDERS)[number]
}

export interface CalendarEvents {
  readonly connectedConnections: number
  readonly events: ReadonlyArray<CalendarEvent>
  readonly timeZone: string
  readonly unavailableConnections: number
}

interface ListCalendarEventsOptions {
  readonly end: string
  readonly start: string
  readonly timeZone?: string
}

const calendarConnectionSchema: z.ZodType<CalendarConnection> = z.object({
  accountLabel: z.string(),
  id: z.string(),
  provider: z.enum(CALENDAR_PROVIDERS),
})
const calendarConnectionsSchema = z.object({connections: z.array(calendarConnectionSchema)})
const calendarAuthorizationSchema = z.object({authorizationUrl: z.url()})

const calendarEventSchema: z.ZodType<CalendarEvent> = z.object({
  accountLabel: z.string(),
  allDay: z.boolean(),
  calendarLabel: z.string(),
  end: z.string(),
  id: z.string(),
  provider: z.enum(CALENDAR_PROVIDERS),
  start: z.string(),
  title: z.string(),
})
const calendarEventsSchema = z.object({
  connectedConnections: z.number().int().nonnegative(),
  events: z.array(calendarEventSchema),
  timeZone: z.string(),
  unavailableConnections: z.number().int().nonnegative(),
})

interface LoadCalendarPromptContextOptions {
  readonly now?: Date
  readonly text: string
  readonly timeZone?: string
  readonly timeZoneOffsetMinutes?: number
}

interface CalendarRequestOptions {
  readonly credentials?: RequestCredentials
  readonly headers?: HeadersInit
}

const createRequestOptions = async (): Promise<CalendarRequestOptions> => {
  if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS !== 'true') {
    return {credentials: 'include'}
  }

  const token = await readStoredAppSession()
  return token === null ? {} : {headers: {Authorization: `Bearer ${token}`}}
}

export const listCalendarConnections = async (): Promise<ReadonlyArray<CalendarConnection>> =>
  (
    await apiJson('calendar/connections', {
      ...(await createRequestOptions()),
      responseSchema: calendarConnectionsSchema,
    })
  ).connections

export const createCalendarAuthorization = async (
  provider: CalendarConnection['provider'],
): Promise<string> =>
  (
    await apiJson(`calendar/connect/${provider}`, {
      ...(await createRequestOptions()),
      method: 'POST',
      responseSchema: calendarAuthorizationSchema,
    })
  ).authorizationUrl

export const deleteCalendarConnection = async (connectionId: string): Promise<void> => {
  const response = await apiJsonRequest(
    `calendar/connections/${encodeURIComponent(connectionId)}`,
    {
      ...(await createRequestOptions()),
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error(`Calendar connection deletion failed with status ${response.status}`)
  }
}

export const listCalendarEvents = async (
  options: ListCalendarEventsOptions,
): Promise<CalendarEvents> => {
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const search = new URLSearchParams({end: options.end, start: options.start, timeZone})
  return apiJson(`calendar/events?${search}`, {
    ...(await createRequestOptions()),
    responseSchema: calendarEventsSchema,
  })
}

/** Opens provider consent with the platform navigation API appropriate to the current build. */
export const openCalendarAuthorization = async (authorizationUrl: string): Promise<void> => {
  if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
    const {openURL} = await import('@apps-in-toss/web-framework')
    await openURL(authorizationUrl)
    return
  }

  globalThis.location.assign(authorizationUrl)
}

/** Loads only the calendar range implied by the current question and returns local-model grounding. */
export const loadCalendarPromptContext = async (
  options: LoadCalendarPromptContextOptions,
): Promise<string | null> => {
  const now = options.now ?? new Date()
  const query = createCalendarQuery({
    now,
    text: options.text,
    timeZoneOffsetMinutes: options.timeZoneOffsetMinutes,
  })

  if (query === null) {
    return null
  }

  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const response = await listCalendarEvents({...query, timeZone})

  if (response.connectedConnections === 0) {
    return '연결된 캘린더가 없습니다. 일정이 없다고 답하지 말고 캘린더 연결이 필요하다고 안내하세요.'
  }

  const context = createCalendarPromptContext({
    events: response.events.slice(0, MAXIMUM_PROMPT_EVENTS),
    timeZone: response.timeZone,
  })
  return response.unavailableConnections === 0
    ? context
    : `${context}\n일부 연결은 조회하지 못했습니다. 누락 가능성을 짧게 알리세요.`
}

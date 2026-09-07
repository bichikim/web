import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {getCalendarService} from 'src/server/calendar/runtime'
import {noStoreJson} from 'src/server/http/response'
import {authenticateUserRequest} from 'src/server/user-auth/request'

const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MAXIMUM_RANGE_DAYS = 32
const MAXIMUM_RANGE_MILLISECONDS =
  MAXIMUM_RANGE_DAYS *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND
const MAXIMUM_TIME_ZONE_CHARACTERS = 100
const querySchema = z.object({
  end: z.iso.datetime(),
  start: z.iso.datetime(),
  timeZone: z.string().min(1).max(MAXIMUM_TIME_ZONE_CHARACTERS),
})

const isValidTimeZone = (timeZone: string) => {
  try {
    const formatter = new Intl.DateTimeFormat('en', {timeZone})
    formatter.resolvedOptions()
    return true
  } catch {
    return false
  }
}

export const GET = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticateUserRequest(event.request)

  if (identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  const url = new URL(event.request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))

  if (!parsed.success || !isValidTimeZone(parsed.data.timeZone)) {
    return noStoreJson(
      {error: 'invalid_calendar_range'},
      {cookies: identity.cookies, status: HTTP_BAD_REQUEST},
    )
  }

  const startTime = new Date(parsed.data.start).getTime()
  const endTime = new Date(parsed.data.end).getTime()
  if (endTime <= startTime || endTime - startTime > MAXIMUM_RANGE_MILLISECONDS) {
    return noStoreJson(
      {error: 'invalid_calendar_range'},
      {cookies: identity.cookies, status: HTTP_BAD_REQUEST},
    )
  }

  try {
    const result = await getCalendarService().listEvents({
      end: parsed.data.end,
      start: parsed.data.start,
      userId: identity.userId,
    })
    return noStoreJson({...result, timeZone: parsed.data.timeZone}, {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to list connected calendar events', error)
    return noStoreJson(
      {error: 'calendar_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}

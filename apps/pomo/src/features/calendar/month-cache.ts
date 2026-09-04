import {z} from 'zod'

import {CALENDAR_PROVIDERS, type CalendarEventRange} from './types'
import type {CalendarEvents} from './client'

const STORAGE_KEY = 'pomo:calendar-month-cache:v1'
const CACHE_VERSION = 1
const MAXIMUM_CACHED_MONTHS = 6

export interface CalendarMonthRange extends CalendarEventRange {
  readonly timeZone: string
}

const calendarEventSchema = z.object({
  accountLabel: z.string(),
  allDay: z.boolean(),
  calendarLabel: z.string(),
  end: z.string(),
  id: z.string(),
  provider: z.enum(CALENDAR_PROVIDERS),
  start: z.string(),
  title: z.string(),
})
const calendarEventsSchema: z.ZodType<CalendarEvents> = z.object({
  connectedConnections: z.number().int().nonnegative(),
  events: z.array(calendarEventSchema),
  timeZone: z.string(),
  unavailableConnections: z.number().int().nonnegative(),
})
const cacheEntrySchema = z.object({
  key: z.string(),
  value: calendarEventsSchema,
})
const cacheSchema = z.object({
  entries: z.array(cacheEntrySchema).max(MAXIMUM_CACHED_MONTHS),
  version: z.literal(CACHE_VERSION),
})

type CalendarMonthCache = z.infer<typeof cacheSchema>

const createCacheKey = (range: CalendarMonthRange) =>
  JSON.stringify([range.start, range.end, range.timeZone])

const resolveStorage = (storage?: Storage): Storage | null => {
  if (storage !== undefined) {
    return storage
  }

  return typeof sessionStorage === 'undefined' ? null : sessionStorage
}

const readCache = (storage: Storage): CalendarMonthCache | null => {
  try {
    const stored = storage.getItem(STORAGE_KEY)
    if (stored === null) {
      return null
    }

    const parsed: unknown = JSON.parse(stored)
    const result = cacheSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export const readCalendarMonthCache = (
  range: CalendarMonthRange,
  storage?: Storage,
): CalendarEvents | null => {
  const resolvedStorage = resolveStorage(storage)
  if (resolvedStorage === null) {
    return null
  }

  const key = createCacheKey(range)
  return readCache(resolvedStorage)?.entries.find((entry) => entry.key === key)?.value ?? null
}

export const writeCalendarMonthCache = (
  range: CalendarMonthRange,
  value: CalendarEvents,
  storage?: Storage,
): unknown | null => {
  const resolvedStorage = resolveStorage(storage)
  if (resolvedStorage === null) {
    return null
  }

  const key = createCacheKey(range)
  const entries = readCache(resolvedStorage)?.entries ?? []
  const nextCache: CalendarMonthCache = {
    entries: [{key, value}, ...entries.filter((entry) => entry.key !== key)].slice(
      0,
      MAXIMUM_CACHED_MONTHS,
    ),
    version: CACHE_VERSION,
  }

  try {
    resolvedStorage.setItem(STORAGE_KEY, JSON.stringify(nextCache))
    return null
  } catch (error: unknown) {
    return error
  }
}

export const clearCalendarMonthCache = (storage?: Storage): unknown | null => {
  const resolvedStorage = resolveStorage(storage)
  if (resolvedStorage === null) {
    return null
  }

  try {
    resolvedStorage.removeItem(STORAGE_KEY)
    return null
  } catch (error: unknown) {
    return error
  }
}

import {z} from 'zod'

import {createBestEffortValueStorage, createJsonCodec, createValueStorage} from '../value-storage'
import {CALENDAR_PROVIDERS, type CalendarEventRange} from './types'
import type {CalendarEvents} from './client'

const STORAGE_KEY = 'pomo:calendar-month-cache:v1'
const CACHE_VERSION = 3
const MAXIMUM_CACHED_MONTHS = 6

export interface CalendarMonthRange extends CalendarEventRange {
  readonly timeZone: string
}

export interface CalendarMonthCacheRange extends CalendarMonthRange {
  readonly accountKey: string
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
  truncated: z.boolean(),
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
type CalendarMonthCacheEntry = CalendarMonthCache['entries'][number]

const cacheCodec = createJsonCodec((value) => {
  const result = cacheSchema.safeParse(value)
  return result.success ? result.data : null
})
const createCacheStorage = (storage: Storage) =>
  createValueStorage({
    ...cacheCodec,
    key: STORAGE_KEY,
    storage: () => storage,
  })

const upsertCacheEntry = (
  entries: CalendarMonthCache['entries'],
  next: CalendarMonthCacheEntry,
): CalendarMonthCache['entries'] =>
  [next, ...entries.filter((entry) => entry.key !== next.key)].slice(0, MAXIMUM_CACHED_MONTHS)

const createCacheKey = (range: CalendarMonthCacheRange) =>
  JSON.stringify([range.accountKey, range.start, range.end, range.timeZone])

const resolveStorage = (storage?: Storage): Storage | null => {
  if (storage !== undefined) {
    return storage
  }

  return typeof sessionStorage === 'undefined' ? null : sessionStorage
}

const readCache = (storage: Storage): CalendarMonthCache | null =>
  createBestEffortValueStorage({
    ...cacheCodec,
    key: STORAGE_KEY,
    storage: () => storage,
  }).read()

export const readCalendarMonthCache = (
  range: CalendarMonthCacheRange,
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
  range: CalendarMonthCacheRange,
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
    entries: upsertCacheEntry(entries, {key, value}),
    version: CACHE_VERSION,
  }

  try {
    createCacheStorage(resolvedStorage).write(nextCache)
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

import type {CalendarEventRange} from './types'

const CALENDAR_INTENT_PATTERN = /(?:일정|미팅|회의|약속|스케줄)/u
const IMPLICIT_SCHEDULE_PATTERN = /(?:오늘|내일|이번 주).*(?:뭐|무엇).*(?:있|하)/u
const MILLISECONDS_PER_MINUTE = 60_000
const MILLISECONDS_PER_DAY = 86_400_000
const NEXT_EVENT_WINDOW_DAYS = 30
const DAYS_PER_WEEK = 7
const NOON_HOUR = 12

interface CreateCalendarQueryOptions {
  readonly now?: Date
  readonly text: string
  readonly timeZoneOffsetMinutes?: number
}

const toLocalTimestamp = (date: Date, offsetMinutes: number) =>
  date.getTime() + offsetMinutes * MILLISECONDS_PER_MINUTE

const fromLocalTimestamp = (timestamp: number, offsetMinutes: number) =>
  new Date(timestamp - offsetMinutes * MILLISECONDS_PER_MINUTE)

const getLocalDayStart = (date: Date, offsetMinutes: number) => {
  const localDate = new Date(toLocalTimestamp(date, offsetMinutes))
  return Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate())
}

const getDayStart = (date: Date, offsetMinutes?: number) => {
  if (offsetMinutes !== undefined) {
    return fromLocalTimestamp(getLocalDayStart(date, offsetMinutes), offsetMinutes)
  }

  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

const addLocalDays = (dayStart: Date, days: number, offsetMinutes?: number) => {
  if (offsetMinutes !== undefined) {
    return new Date(dayStart.getTime() + days * MILLISECONDS_PER_DAY)
  }

  const date = new Date(dayStart)
  date.setDate(date.getDate() + days)
  return date
}

const toRange = (start: Date, end: Date): CalendarEventRange => ({
  end: end.toISOString(),
  start: start.toISOString(),
})

/** Resolves a bounded calendar range only when the text asks about calendar events. */
export const createCalendarQuery = (
  options: CreateCalendarQueryOptions,
): CalendarEventRange | null => {
  if (
    !CALENDAR_INTENT_PATTERN.test(options.text) &&
    !IMPLICIT_SCHEDULE_PATTERN.test(options.text)
  ) {
    return null
  }

  const now = options.now ?? new Date()
  const offsetMinutes = options.timeZoneOffsetMinutes
  const localDayStart = getDayStart(now, offsetMinutes)

  if (options.text.includes('내일')) {
    const tomorrowStart = addLocalDays(localDayStart, 1, offsetMinutes)
    const tomorrowEnd = addLocalDays(tomorrowStart, 1, offsetMinutes)

    if (options.text.includes('오전')) {
      tomorrowEnd.setTime(
        offsetMinutes === undefined
          ? new Date(tomorrowStart).setHours(NOON_HOUR)
          : tomorrowStart.getTime() + MILLISECONDS_PER_DAY / 2,
      )
    }

    return toRange(tomorrowStart, tomorrowEnd)
  }

  if (options.text.includes('오늘')) {
    return toRange(now, addLocalDays(localDayStart, 1, offsetMinutes))
  }

  if (options.text.includes('이번 주')) {
    const localWeekday =
      offsetMinutes === undefined
        ? localDayStart.getDay()
        : new Date(toLocalTimestamp(localDayStart, offsetMinutes)).getUTCDay()
    const daysUntilMonday = localWeekday === 0 ? 1 : DAYS_PER_WEEK + 1 - localWeekday
    return toRange(now, addLocalDays(localDayStart, daysUntilMonday, offsetMinutes))
  }

  return toRange(now, new Date(now.getTime() + NEXT_EVENT_WINDOW_DAYS * MILLISECONDS_PER_DAY))
}

import {dayjs} from 'src/utils/zoned-dayjs'
import type {CalendarEventRange} from './types'

const CALENDAR_INTENT_PATTERN = /(?:일정|미팅|회의|약속|스케줄)/u
const IMPLICIT_SCHEDULE_PATTERN = /(?:오늘|내일|이번 주).*(?:뭐|무엇).*(?:있|하)/u
const MILLISECONDS_PER_DAY = 86_400_000
const NEXT_EVENT_WINDOW_DAYS = 30
const DAYS_PER_WEEK = 7

interface CreateCalendarQueryOptions {
  readonly now?: Date
  readonly text: string
  readonly timeZone?: string
}

const toRange = (start: Date, end: Date): CalendarEventRange => ({
  end: end.toISOString(),
  start: start.toISOString(),
})

/** Resolves a bounded calendar range in the requested time zone. */
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
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const local = dayjs(now).tz(timeZone)
  // Reparse each calendar boundary so DST offsets belong to that date, not to today.
  const boundary = (days: number, time = '00:00:00') => {
    const date = dayjs.utc(local.format('YYYY-MM-DD')).add(days, 'day').format('YYYY-MM-DD')
    return dayjs.tz(`${date}T${time}`, timeZone).toDate()
  }

  if (options.text.includes('내일')) {
    return toRange(
      boundary(1),
      options.text.includes('오전') ? boundary(1, '12:00:00') : boundary(2),
    )
  }
  if (options.text.includes('오늘')) {
    return toRange(now, boundary(1))
  }
  if (options.text.includes('이번 주')) {
    const weekday = local.day()
    return toRange(now, boundary(weekday === 0 ? 1 : DAYS_PER_WEEK + 1 - weekday))
  }
  return toRange(now, new Date(now.getTime() + NEXT_EVENT_WINDOW_DAYS * MILLISECONDS_PER_DAY))
}

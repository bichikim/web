import {dayjs} from 'src/utils/zoned-dayjs'
import type {CalendarEventRange} from './types'

const CALENDAR_INTENT_PATTERN = /(?:일정|미팅|회의|약속|스케줄)/u
const THIS_WEEK_PATTERN = /이번 ?주/u
const THIS_WEEK_EXCLUSION_PATTERN =
  /이번 ?주(?:(?!다음 ?주).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const NEXT_WEEK_EXCLUSION_PATTERN =
  /다음 ?주(?:(?!이번 ?주).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const TODAY_EXCLUSION_PATTERN =
  /오늘(?:(?!내일).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const YESTERDAY_EXCLUSION_PATTERN =
  /어제(?:(?!오늘|내일).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const TOMORROW_EXCLUSION_PATTERN =
  /내일(?:(?!오늘).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const DAY_AFTER_TOMORROW_EXCLUSION_PATTERN =
  /모레(?:(?!오늘|내일).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const NEXT_WEEK_PATTERN = /다음 ?주/u
const IMPLICIT_SCHEDULE_PATTERN =
  /(?:오늘|내일|모레|어제|이번 ?주|다음 ?주).*(?:뭐|무엇).*(?:있|하)/u
const MILLISECONDS_PER_DAY = 86_400_000
const DAY_AFTER_TOMORROW_START_DAYS = 2
const DAY_AFTER_TOMORROW_END_DAYS = 3
const NEXT_EVENT_WINDOW_DAYS = 30

const includesUnexcludedPhrase = (
  text: string,
  phrase: string,
  exclusionPattern: RegExp,
): boolean => text.includes(phrase) && !exclusionPattern.test(text)
const DAYS_PER_WEEK = 7

interface CreateCalendarQueryOptions {
  readonly now?: Date
  readonly text: string
  readonly timeZone?: string
}

interface CreateCalendarDateRangeOptions {
  readonly afternoonStart: Date
  readonly end: Date
  readonly morningEnd: Date
  readonly now: Date
  readonly start: Date
  readonly text: string
}

interface CreateCalendarWeekRangeOptions {
  readonly boundary: (days: number) => Date
  readonly daysUntilNextMonday: number
  readonly includesNextWeek: boolean
  readonly includesThisWeek: boolean
  readonly includesToday: boolean
  readonly includesYesterday: boolean
  readonly now: Date
}

const toRange = (start: Date, end: Date): CalendarEventRange => ({
  end: end.toISOString(),
  start: start.toISOString(),
})

const getFirstRequestedDateOffset = (includesToday: boolean, includesTomorrow: boolean) => {
  if (includesToday) {
    return 0
  }

  return includesTomorrow ? 1 : DAY_AFTER_TOMORROW_START_DAYS
}

const createCalendarDateRange = ({
  afternoonStart,
  end,
  morningEnd,
  now,
  start,
  text,
}: CreateCalendarDateRangeOptions): CalendarEventRange => {
  if (text.includes('오전')) {
    return toRange(start, morningEnd)
  }

  if (text.includes('오후')) {
    return toRange(now.getTime() < afternoonStart.getTime() ? afternoonStart : now, end)
  }

  return toRange(start, end)
}

const createCalendarWeekRange = ({
  boundary,
  daysUntilNextMonday,
  includesNextWeek,
  includesThisWeek,
  includesToday,
  includesYesterday,
  now,
}: CreateCalendarWeekRangeOptions): CalendarEventRange | null => {
  if (!includesThisWeek && !includesNextWeek) {
    return null
  }

  const nextMonday = boundary(daysUntilNextMonday)
  const followingMonday = boundary(daysUntilNextMonday + DAYS_PER_WEEK)
  const startsThisWeek = includesThisWeek || (includesToday && includesNextWeek)
  const start = includesYesterday ? boundary(-1) : startsThisWeek ? now : nextMonday
  const end = includesNextWeek ? followingMonday : nextMonday
  return toRange(start, end)
}

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

  const includesToday = includesUnexcludedPhrase(options.text, '오늘', TODAY_EXCLUSION_PATTERN)
  const includesTomorrow = includesUnexcludedPhrase(
    options.text,
    '내일',
    TOMORROW_EXCLUSION_PATTERN,
  )
  const includesYesterday = includesUnexcludedPhrase(
    options.text,
    '어제',
    YESTERDAY_EXCLUSION_PATTERN,
  )
  const includesThisWeek =
    THIS_WEEK_PATTERN.test(options.text) && !THIS_WEEK_EXCLUSION_PATTERN.test(options.text)
  const includesNextWeek =
    NEXT_WEEK_PATTERN.test(options.text) && !NEXT_WEEK_EXCLUSION_PATTERN.test(options.text)
  const includesDayAfterTomorrow = includesUnexcludedPhrase(
    options.text,
    '모레',
    DAY_AFTER_TOMORROW_EXCLUSION_PATTERN,
  )
  if (includesDayAfterTomorrow) {
    const startDayOffset = getFirstRequestedDateOffset(includesToday, includesTomorrow)
    const start = includesToday ? now : boundary(startDayOffset)
    const noon = boundary(DAY_AFTER_TOMORROW_START_DAYS, '12:00:00')
    return createCalendarDateRange({
      afternoonStart: boundary(startDayOffset, '12:00:00'),
      end: boundary(DAY_AFTER_TOMORROW_END_DAYS),
      morningEnd: noon,
      now,
      start,
      text: options.text,
    })
  }
  if (includesTomorrow) {
    const start = includesToday ? now : boundary(1)
    const noon = boundary(1, '12:00:00')
    return createCalendarDateRange({
      afternoonStart: includesToday ? boundary(0, '12:00:00') : noon,
      end: boundary(2),
      morningEnd: noon,
      now,
      start: includesYesterday ? boundary(-1) : start,
      text: options.text,
    })
  }
  if (includesToday && !includesThisWeek && !includesNextWeek) {
    const end = boundary(1)
    return createCalendarDateRange({
      afternoonStart: boundary(0, '12:00:00'),
      end,
      morningEnd: end,
      now,
      start: includesYesterday ? boundary(-1) : now,
      text: options.text,
    })
  }
  const weekday = local.day()
  const daysUntilNextMonday = weekday === 0 ? 1 : DAYS_PER_WEEK + 1 - weekday
  const weekRange = createCalendarWeekRange({
    boundary,
    daysUntilNextMonday,
    includesNextWeek,
    includesThisWeek,
    includesToday,
    includesYesterday,
    now,
  })
  if (weekRange !== null) {
    return weekRange
  }
  if (includesYesterday) {
    return toRange(boundary(-1), boundary(0))
  }
  return toRange(now, new Date(now.getTime() + NEXT_EVENT_WINDOW_DAYS * MILLISECONDS_PER_DAY))
}

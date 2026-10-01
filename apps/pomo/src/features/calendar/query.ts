import {dayjs} from 'src/utils/zoned-dayjs'
import type {CalendarEventRange} from './types'

const CALENDAR_INTENT_PATTERN = /(?:일정|미팅|회의|약속|스케줄)/u
const WEEK_BOUNDARY_PATTERN =
  /(?=$|[\s,.!?…]|(?:에는|에서|부터|까지|은|는|이|가|을|를|에|엔|도|로|만|중|쯤)(?=$|[\s,.!?…]))/u
const WEEKDAY_NAME_PATTERN_SOURCE = '[월화수목금토일]'
const THIS_WEEK_WEEKDAY_PATTERN = new RegExp(
  `이번 ?주(?:\\s*(?:에는|에|엔|은|는|도))?\\s*(?<weekday>${WEEKDAY_NAME_PATTERN_SOURCE})(?:요일)?${WEEK_BOUNDARY_PATTERN.source}`,
  'u',
)
const WEEKDAY_NAMES_FROM_MONDAY = ['월', '화', '수', '목', '금', '토', '일'] as const
const WEEKDAY_OFFSET_FROM_MONDAY: ReadonlyMap<string, number> = new Map(
  WEEKDAY_NAMES_FROM_MONDAY.map((dayName, offset) => [dayName, offset] as const),
)
const THIS_WEEK_PATTERN = new RegExp(`이번 ?주${WEEK_BOUNDARY_PATTERN.source}`, 'u')
const THIS_WEEK_EXCLUSION_PATTERN =
  /이번 ?주(?:(?!다음 ?주).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const NEXT_WEEK_EXCLUSION_PATTERN =
  /다음 ?주(?:(?!이번 ?주).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const NEXT_WEEKEND_PATTERN = /다음 ?주말/u
const PREVIOUS_WEEKEND_PATTERN = /(?:지난|저번) ?주말/u
const WEEKEND_EXCLUSION_PATTERN =
  /주말(?:은|에)?\s*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const WEEKEND_PATTERN = /주말/u
const DAY_BEFORE_YESTERDAY_EXCLUSION_PATTERN =
  /그저께(?:(?!어제|오늘|내일|모레|글피).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const TODAY_EXCLUSION_PATTERN =
  /오늘(?:(?!내일).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const YESTERDAY_EXCLUSION_PATTERN =
  /어제(?:(?!오늘|내일).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const TOMORROW_EXCLUSION_PATTERN =
  /내일(?:(?!오늘).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const DAY_AFTER_TOMORROW_EXCLUSION_PATTERN =
  /모레(?:(?!오늘|내일).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const THREE_DAYS_AHEAD_EXCLUSION_PATTERN =
  /글피(?:(?!그저께|어제|오늘|내일|모레).)*(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
const NEXT_WEEK_PATTERN = new RegExp(`다음 ?주${WEEK_BOUNDARY_PATTERN.source}`, 'u')
const IMPLICIT_SCHEDULE_PATTERN = new RegExp(
  `(?:그저께|오늘|내일|모레|글피|어제|${THIS_WEEK_PATTERN.source}|${NEXT_WEEK_PATTERN.source}|주말)` +
    `(?:\\s*(?:에는|에|엔|은|는|도))?` +
    `(?:\\s*(?:새벽|아침|오전|점심|오후|저녁|밤|낮|정오))?` +
    `(?:\\s*(?:에는|에|엔|은|는|도))?\\s*` +
    `(?:뭐|무엇)(?:가|이|은|는)?\\s*(?:있|하)`,
  'u',
)
const MILLISECONDS_PER_DAY = 86_400_000
const DAY_BEFORE_YESTERDAY_START_DAYS = -2
const DAY_AFTER_TOMORROW_START_DAYS = 2
const THREE_DAYS_AHEAD_START_DAYS = 3
const DAYS_FROM_NEXT_MONDAY_TO_SATURDAY = 5
const NEXT_EVENT_WINDOW_DAYS = 30

const includesUnexcludedPhrase = (
  text: string,
  phrase: string,
  exclusionPattern: RegExp,
): boolean => text.includes(phrase) && !exclusionPattern.test(text)
const isStandaloneDateRequest = (includesDate: boolean, includesThisWeek: boolean): boolean =>
  includesDate && !includesThisWeek
const DAYS_PER_WEEK = 7
type CalendarWeekendIntent = 'next' | 'previous' | 'upcoming'

const getCalendarWeekendIntent = (text: string): CalendarWeekendIntent | null => {
  if (!WEEKEND_PATTERN.test(text) || WEEKEND_EXCLUSION_PATTERN.test(text)) {
    return null
  }

  if (PREVIOUS_WEEKEND_PATTERN.test(text)) {
    return 'previous'
  }

  return NEXT_WEEKEND_PATTERN.test(text) ? 'next' : 'upcoming'
}

interface CreateCalendarQueryOptions {
  readonly now?: Date
  readonly text: string
  readonly timeZone?: string
}

interface CalendarQueryIntent {
  readonly includesNextWeek: boolean
  readonly includesThisWeek: boolean
  readonly requestedWeekdayOffset: number | null
  readonly relativeDayOffsets: ReadonlyArray<number>
  readonly weekendIntent: CalendarWeekendIntent | null
}

interface CreateCalendarDateRangeOptions {
  readonly afternoonStart: Date
  readonly end: Date
  readonly morningEnd: Date
  readonly now: Date
  readonly start: Date
  readonly text: string
}

interface CreateStandaloneCalendarDateRangeOptions {
  readonly boundary: (days: number, time?: string) => Date
  readonly includesNextWeek: boolean
  readonly includesThisWeek: boolean
  readonly now: Date
  readonly relativeDayOffsets: ReadonlyArray<number>
  readonly text: string
}

interface CreateCalendarPeriodRangeOptions {
  readonly boundary: (days: number, time?: string) => Date
  readonly daysUntilNextMonday: number
  readonly includesNextWeek: boolean
  readonly includesThisWeek: boolean
  readonly now: Date
  readonly requestedWeekdayOffset: number | null
  readonly relativeDayOffsets: ReadonlyArray<number>
  readonly text: string
  readonly weekday: number
  readonly weekendIntent: CalendarWeekendIntent | null
}

interface CreateCalendarWeekendRangeOptions {
  readonly boundary: (days: number) => Date
  readonly daysUntilNextMonday: number
  readonly intent: CalendarWeekendIntent
  readonly now: Date
  readonly weekday: number
}

interface GetWeekendStartOffsetOptions {
  readonly daysUntilNextMonday: number
  readonly intent: CalendarWeekendIntent
  readonly weekday: number
}

const getCalendarQueryIntent = (text: string): CalendarQueryIntent => ({
  includesNextWeek: NEXT_WEEK_PATTERN.test(text) && !NEXT_WEEK_EXCLUSION_PATTERN.test(text),
  includesThisWeek:
    (THIS_WEEK_PATTERN.test(text) || THIS_WEEK_WEEKDAY_PATTERN.test(text)) &&
    !THIS_WEEK_EXCLUSION_PATTERN.test(text),
  relativeDayOffsets: [
    ...(includesUnexcludedPhrase(text, '그저께', DAY_BEFORE_YESTERDAY_EXCLUSION_PATTERN)
      ? [DAY_BEFORE_YESTERDAY_START_DAYS]
      : []),
    ...(includesUnexcludedPhrase(text, '어제', YESTERDAY_EXCLUSION_PATTERN) ? [-1] : []),
    ...(includesUnexcludedPhrase(text, '오늘', TODAY_EXCLUSION_PATTERN) ? [0] : []),
    ...(includesUnexcludedPhrase(text, '내일', TOMORROW_EXCLUSION_PATTERN) ? [1] : []),
    ...(includesUnexcludedPhrase(text, '모레', DAY_AFTER_TOMORROW_EXCLUSION_PATTERN)
      ? [DAY_AFTER_TOMORROW_START_DAYS]
      : []),
    ...(includesUnexcludedPhrase(text, '글피', THREE_DAYS_AHEAD_EXCLUSION_PATTERN)
      ? [THREE_DAYS_AHEAD_START_DAYS]
      : []),
  ],
  requestedWeekdayOffset:
    WEEKDAY_OFFSET_FROM_MONDAY.get(THIS_WEEK_WEEKDAY_PATTERN.exec(text)?.groups?.weekday ?? '') ??
    null,
  weekendIntent: getCalendarWeekendIntent(text),
})

const toRange = (start: Date, end: Date): CalendarEventRange => ({
  end: end.toISOString(),
  start: start.toISOString(),
})

const getFirstRequestedDateOffset = (relativeDayOffsets: ReadonlyArray<number>) =>
  relativeDayOffsets[0] ?? DAY_AFTER_TOMORROW_START_DAYS
const getLastRequestedDateOffset = (relativeDayOffsets: ReadonlyArray<number>) =>
  relativeDayOffsets[relativeDayOffsets.length - 1] ?? DAY_AFTER_TOMORROW_START_DAYS

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
    const afternoonRangeStart =
      now.getTime() < afternoonStart.getTime() || now.getTime() >= end.getTime()
        ? afternoonStart
        : now
    return toRange(afternoonRangeStart, end)
  }

  return toRange(start, end)
}

const createStandaloneCalendarDateRange = ({
  boundary,
  includesNextWeek,
  includesThisWeek,
  now,
  relativeDayOffsets,
  text,
}: CreateStandaloneCalendarDateRangeOptions): CalendarEventRange | null => {
  const includesExtendedRelativeDate = relativeDayOffsets.some(
    (offset) => offset < -1 || offset > 1,
  )
  if (isStandaloneDateRequest(includesExtendedRelativeDate, includesThisWeek)) {
    const startDayOffset = getFirstRequestedDateOffset(relativeDayOffsets)
    const endDayOffset = getLastRequestedDateOffset(relativeDayOffsets)
    const includesToday = relativeDayOffsets.includes(0)
    const start = includesToday && startDayOffset === 0 ? now : boundary(startDayOffset)
    const noon = boundary(endDayOffset, '12:00:00')
    return createCalendarDateRange({
      afternoonStart: boundary(startDayOffset, '12:00:00'),
      end: boundary(endDayOffset + 1),
      morningEnd: noon,
      now,
      start,
      text,
    })
  }

  if (isStandaloneDateRequest(relativeDayOffsets.includes(1), includesThisWeek)) {
    const start = relativeDayOffsets.includes(0) ? now : boundary(1)
    const noon = boundary(1, '12:00:00')
    return createCalendarDateRange({
      afternoonStart: relativeDayOffsets.includes(0) ? boundary(0, '12:00:00') : noon,
      end: boundary(2),
      morningEnd: noon,
      now,
      start: relativeDayOffsets.includes(-1) ? boundary(-1) : start,
      text,
    })
  }

  if (relativeDayOffsets.includes(0) && !includesThisWeek && !includesNextWeek) {
    const end = boundary(1)
    return createCalendarDateRange({
      afternoonStart: boundary(0, '12:00:00'),
      end,
      morningEnd: end,
      now,
      start: relativeDayOffsets.includes(-1) ? boundary(-1) : now,
      text,
    })
  }

  return null
}

const getWeekendStartOffset = ({
  daysUntilNextMonday,
  intent,
  weekday,
}: GetWeekendStartOffsetOptions): number => {
  switch (intent) {
    case 'next':
      return daysUntilNextMonday + DAYS_FROM_NEXT_MONDAY_TO_SATURDAY
    case 'previous': {
      const daysSincePreviousMonday = weekday === 0 ? DAYS_PER_WEEK - 1 : weekday - 1
      return -(daysSincePreviousMonday + 2)
    }
    case 'upcoming':
      return daysUntilNextMonday - 2
    default: {
      const exhaustiveIntent: never = intent
      return exhaustiveIntent
    }
  }
}

const createCalendarWeekendRange = ({
  boundary,
  daysUntilNextMonday,
  intent,
  now,
  weekday,
}: CreateCalendarWeekendRangeOptions): CalendarEventRange => {
  const startOffset = getWeekendStartOffset({daysUntilNextMonday, intent, weekday})
  const isCurrentWeekend = intent === 'upcoming' && (weekday === 0 || weekday === DAYS_PER_WEEK - 1)
  const start = isCurrentWeekend ? now : boundary(startOffset)
  return toRange(start, boundary(startOffset + 2))
}

const createCalendarPeriodRange = ({
  boundary,
  daysUntilNextMonday,
  includesNextWeek,
  includesThisWeek,
  now,
  requestedWeekdayOffset,
  relativeDayOffsets,
  text,
  weekday,
  weekendIntent,
}: CreateCalendarPeriodRangeOptions): CalendarEventRange | null => {
  if (weekendIntent !== null) {
    return createCalendarWeekendRange({
      boundary,
      daysUntilNextMonday,
      intent: weekendIntent,
      now,
      weekday,
    })
  }

  if (!includesThisWeek && !includesNextWeek) {
    return null
  }

  if (
    includesThisWeek &&
    !includesNextWeek &&
    relativeDayOffsets.length === 0 &&
    requestedWeekdayOffset !== null
  ) {
    const currentWeekdayOffset = weekday === 0 ? DAYS_PER_WEEK - 1 : weekday - 1
    const requestedDayOffset = requestedWeekdayOffset - currentWeekdayOffset
    const morningEnd = boundary(requestedDayOffset, '12:00:00')
    const isPastSameDayMorning =
      requestedDayOffset === 0 && text.includes('오전') && now.getTime() >= morningEnd.getTime()
    const start =
      requestedDayOffset === 0 && !isPastSameDayMorning ? now : boundary(requestedDayOffset)
    return createCalendarDateRange({
      afternoonStart: morningEnd,
      end: boundary(requestedDayOffset + 1),
      morningEnd,
      now,
      start,
      text,
    })
  }

  const nextMonday = boundary(daysUntilNextMonday)
  const followingMonday = boundary(daysUntilNextMonday + DAYS_PER_WEEK)
  const startsThisWeek = includesThisWeek || (relativeDayOffsets.includes(0) && includesNextWeek)
  const includesRequestedDate = relativeDayOffsets.length > 0
  const requestedDateOffset = getFirstRequestedDateOffset(relativeDayOffsets)
  const requestedDateStart = requestedDateOffset === 0 ? now : boundary(requestedDateOffset)
  const start = includesRequestedDate ? requestedDateStart : startsThisWeek ? now : nextMonday
  const end = includesNextWeek ? followingMonday : nextMonday
  return toRange(start, end)
}

const hasCalendarQueryIntent = (text: string) =>
  CALENDAR_INTENT_PATTERN.test(text) || IMPLICIT_SCHEDULE_PATTERN.test(text)

/** Resolves a bounded calendar range in the requested time zone. */
export const createCalendarQuery = (
  options: CreateCalendarQueryOptions,
): CalendarEventRange | null => {
  if (!hasCalendarQueryIntent(options.text)) {
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

  const {
    includesNextWeek,
    includesThisWeek,
    relativeDayOffsets,
    requestedWeekdayOffset,
    weekendIntent,
  } = getCalendarQueryIntent(options.text)
  const standaloneDateRange = createStandaloneCalendarDateRange({
    boundary,
    includesNextWeek,
    includesThisWeek,
    now,
    relativeDayOffsets,
    text: options.text,
  })
  if (standaloneDateRange !== null) {
    return standaloneDateRange
  }
  const weekday = local.day()
  const daysUntilNextMonday = weekday === 0 ? 1 : DAYS_PER_WEEK + 1 - weekday
  const weekRange = createCalendarPeriodRange({
    boundary,
    daysUntilNextMonday,
    includesNextWeek,
    includesThisWeek,
    now,
    relativeDayOffsets,
    requestedWeekdayOffset,
    text: options.text,
    weekday,
    weekendIntent,
  })
  if (weekRange !== null) {
    return weekRange
  }
  if (relativeDayOffsets.includes(-1)) {
    return toRange(boundary(-1), boundary(0))
  }
  return toRange(now, new Date(now.getTime() + NEXT_EVENT_WINDOW_DAYS * MILLISECONDS_PER_DAY))
}

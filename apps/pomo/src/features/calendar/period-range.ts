import type {CalendarEventRange} from './types'

export const DAY_AFTER_TOMORROW_START_DAYS = 2
export const DAYS_PER_WEEK = 7
const DAYS_FROM_NEXT_MONDAY_TO_PREVIOUS_WEEK = DAYS_PER_WEEK * 2
const DAYS_FROM_NEXT_MONDAY_TO_TWO_WEEKS_AGO =
  DAYS_FROM_NEXT_MONDAY_TO_PREVIOUS_WEEK + DAYS_PER_WEEK
const DAYS_FROM_NEXT_MONDAY_TO_SATURDAY = 5

export type CalendarWeekendIntent = 'after-next' | 'next' | 'previous' | 'upcoming'

export const getFirstRequestedDateOffset = (relativeDayOffsets: ReadonlyArray<number>) =>
  relativeDayOffsets[0] ?? DAY_AFTER_TOMORROW_START_DAYS
export const getLastRequestedDateOffset = (relativeDayOffsets: ReadonlyArray<number>) =>
  relativeDayOffsets[relativeDayOffsets.length - 1] ?? DAY_AFTER_TOMORROW_START_DAYS

interface CreateCalendarPeriodRangeOptions {
  readonly boundary: (days: number) => Date
  readonly daysUntilNextMonday: number
  readonly includesNextWeek: boolean
  readonly includesPreviousWeek: boolean
  readonly includesThisWeek: boolean
  readonly includesTwoWeeksAgo: boolean
  readonly includesWeekAfterNext: boolean
  readonly now: Date
  readonly relativeDayOffsets: ReadonlyArray<number>
  readonly requestedWeekdayOffsets: ReadonlyArray<number>
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

export const toRange = (start: Date, end: Date): CalendarEventRange => ({
  end: end.toISOString(),
  start: start.toISOString(),
})

const getWeekendStartOffset = ({
  daysUntilNextMonday,
  intent,
  weekday,
}: GetWeekendStartOffsetOptions): number => {
  switch (intent) {
    case 'after-next':
      return daysUntilNextMonday + DAYS_FROM_NEXT_MONDAY_TO_SATURDAY + DAYS_PER_WEEK
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

const getFirstIncludedCalendarBoundary = (
  candidates: ReadonlyArray<{readonly boundary: Date; readonly included: boolean}>,
  fallback: Date,
): Date => candidates.find(({included}) => included)?.boundary ?? fallback

export const createCalendarRangeFromDayOffsets = ({
  boundary,
  dayOffsets,
}: {
  readonly boundary: (days: number) => Date
  readonly dayOffsets: ReadonlyArray<number>
}): {readonly end: Date; readonly start: Date} | null => {
  if (dayOffsets.length === 0) {
    return null
  }

  const firstDayOffset = Math.min(...dayOffsets)
  const lastDayOffset = Math.max(...dayOffsets)
  return {end: boundary(lastDayOffset + 1), start: boundary(firstDayOffset)}
}

export const createCalendarMonthRange = ({
  boundary,
  monthOffsets,
  now,
}: {
  readonly boundary: (months: number) => Date
  readonly monthOffsets: ReadonlyArray<number>
  readonly now: Date
}): CalendarEventRange | null => {
  if (monthOffsets.length !== 1) {
    return null
  }

  const monthOffset = monthOffsets[0] ?? 0
  const start = monthOffset === 0 ? now : boundary(monthOffset)
  return toRange(start, boundary(monthOffset + 1))
}

interface WeekdayRangeOptions {
  /** 요청 시간대에서 상대 날짜의 자정 경계를 계산한다. */
  readonly boundary: (days: number) => Date
  /** 현재 현지 요일이며 일요일은 0이다. */
  readonly currentWeekday: number
  /** true이면 이번 주의 요일을 고른다. 생략하면 다음 7일 안의 요일을 고른다. */
  readonly thisWeek?: boolean
  /** 월요일을 0으로 하는 요청 요일 목록이다. 비어 있으면 범위를 만들지 않는다. */
  readonly weekdayOffsets: ReadonlyArray<number>
}

export const createCalendarWeekdayRange = ({
  boundary,
  currentWeekday,
  thisWeek = false,
  weekdayOffsets,
}: WeekdayRangeOptions): {
  readonly end: Date
  readonly firstDayOffset: number
  readonly lastDayOffset: number
  readonly start: Date
} | null => {
  const currentWeekdayFromMonday = currentWeekday === 0 ? DAYS_PER_WEEK - 1 : currentWeekday - 1
  const dayOffsets = weekdayOffsets.map((weekdayOffset) => {
    const dayOffset = weekdayOffset - currentWeekdayFromMonday
    return thisWeek ? dayOffset : (dayOffset + DAYS_PER_WEEK) % DAYS_PER_WEEK
  })
  const calendarRange = createCalendarRangeFromDayOffsets({boundary, dayOffsets})
  if (calendarRange === null) {
    return null
  }

  return {
    ...calendarRange,
    firstDayOffset: Math.min(...dayOffsets),
    lastDayOffset: Math.max(...dayOffsets),
  }
}

interface CreateRequestedWeekdayRangeOptions {
  readonly boundary: (days: number) => Date
  readonly daysUntilNextMonday: number
  readonly requestedWeekdayOffsets: ReadonlyArray<number>
}

const createRequestedWeekdayRange = ({
  boundary,
  daysUntilNextMonday,
  requestedWeekdayOffsets,
}: CreateRequestedWeekdayRangeOptions): {readonly end: Date; readonly start: Date} | null => {
  return createCalendarRangeFromDayOffsets({
    boundary,
    dayOffsets: requestedWeekdayOffsets.map((offset) => daysUntilNextMonday + offset),
  })
}

export const createCalendarPeriodRange = ({
  boundary,
  daysUntilNextMonday,
  includesNextWeek,
  includesPreviousWeek,
  includesThisWeek,
  includesTwoWeeksAgo,
  includesWeekAfterNext,
  now,
  relativeDayOffsets,
  requestedWeekdayOffsets,
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

  if (
    ![
      includesTwoWeeksAgo,
      includesPreviousWeek,
      includesThisWeek,
      includesNextWeek,
      includesWeekAfterNext,
    ].some(Boolean)
  ) {
    return null
  }

  const currentMonday = boundary(daysUntilNextMonday - DAYS_PER_WEEK)
  const nextMonday = boundary(daysUntilNextMonday)
  const previousMonday = boundary(daysUntilNextMonday - DAYS_FROM_NEXT_MONDAY_TO_PREVIOUS_WEEK)
  const twoWeeksAgoMonday = boundary(daysUntilNextMonday - DAYS_FROM_NEXT_MONDAY_TO_TWO_WEEKS_AGO)
  const weekAfterNextMonday = boundary(daysUntilNextMonday + DAYS_PER_WEEK)
  const weekAfterNextEnd = boundary(daysUntilNextMonday + DAYS_PER_WEEK * 2)
  const includesFutureWeek = includesNextWeek || includesWeekAfterNext
  const startsThisWeek = includesThisWeek || (relativeDayOffsets.includes(0) && includesFutureWeek)
  const includesRequestedDate = relativeDayOffsets.length > 0
  const requestedDateOffset = relativeDayOffsets[0] ?? 2
  const lastRequestedDateOffset = relativeDayOffsets[relativeDayOffsets.length - 1] ?? 2
  const requestedDateStart = requestedDateOffset === 0 ? now : boundary(requestedDateOffset)
  const requestedDateEnd = boundary(lastRequestedDateOffset + 1)
  const requestedWeekdayRange = includesNextWeek
    ? createRequestedWeekdayRange({boundary, daysUntilNextMonday, requestedWeekdayOffsets})
    : null
  const start = getFirstIncludedCalendarBoundary(
    [
      {boundary: twoWeeksAgoMonday, included: includesTwoWeeksAgo},
      {boundary: previousMonday, included: includesPreviousWeek},
      {boundary: requestedDateStart, included: includesRequestedDate},
      {boundary: now, included: startsThisWeek},
      {
        boundary: requestedWeekdayRange?.start ?? nextMonday,
        included: includesNextWeek,
      },
      {boundary: weekAfterNextMonday, included: includesWeekAfterNext},
    ],
    nextMonday,
  )
  const weekEnd = getFirstIncludedCalendarBoundary(
    [
      {boundary: weekAfterNextEnd, included: includesWeekAfterNext},
      {
        boundary: requestedWeekdayRange?.end ?? weekAfterNextMonday,
        included: includesNextWeek,
      },
      {boundary: nextMonday, included: includesThisWeek},
      {boundary: currentMonday, included: includesPreviousWeek},
      {boundary: previousMonday, included: includesTwoWeeksAgo},
    ],
    currentMonday,
  )
  const end =
    (includesPreviousWeek || includesTwoWeeksAgo) &&
    includesRequestedDate &&
    requestedDateEnd.getTime() > weekEnd.getTime()
      ? requestedDateEnd
      : weekEnd
  return toRange(start, end)
}

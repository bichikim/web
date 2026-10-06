import type {CalendarEventRange} from './types'

export const DAY_AFTER_TOMORROW_START_DAYS = 2
export const DAYS_PER_WEEK = 7
const DAYS_FROM_NEXT_MONDAY_TO_PREVIOUS_WEEK = DAYS_PER_WEEK * 2
const DAYS_FROM_NEXT_MONDAY_TO_TWO_WEEKS_AGO =
  DAYS_FROM_NEXT_MONDAY_TO_PREVIOUS_WEEK + DAYS_PER_WEEK
const DAYS_FROM_NEXT_MONDAY_TO_SATURDAY = 5

export type CalendarWeekendIntent = 'next' | 'previous' | 'upcoming'

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
    !includesTwoWeeksAgo &&
    !includesPreviousWeek &&
    !includesThisWeek &&
    !includesNextWeek &&
    !includesWeekAfterNext
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
  const start = getFirstIncludedCalendarBoundary(
    [
      {boundary: twoWeeksAgoMonday, included: includesTwoWeeksAgo},
      {boundary: previousMonday, included: includesPreviousWeek},
      {boundary: requestedDateStart, included: includesRequestedDate},
      {boundary: now, included: startsThisWeek},
      {boundary: nextMonday, included: includesNextWeek},
      {boundary: weekAfterNextMonday, included: includesWeekAfterNext},
    ],
    nextMonday,
  )
  const weekEnd = getFirstIncludedCalendarBoundary(
    [
      {boundary: weekAfterNextEnd, included: includesWeekAfterNext},
      {boundary: weekAfterNextMonday, included: includesNextWeek},
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

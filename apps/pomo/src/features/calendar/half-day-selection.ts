import {createCalendarExclusionPattern} from './create-calendar-exclusion-pattern'
import {toRange} from './period-range'
import type {CalendarEventQuery} from './types'

const MORNING_EXCLUSION_PATTERN = createCalendarExclusionPattern('오전', '오후')
const AFTERNOON_EXCLUSION_PATTERN = createCalendarExclusionPattern('오후', '오전')
export const includesRequestedMorning = (text: string): boolean =>
  text.includes('오전') &&
  !(
    text.includes('오후') &&
    !AFTERNOON_EXCLUSION_PATTERN.test(text) &&
    MORNING_EXCLUSION_PATTERN.test(text)
  )

interface CreateCalendarDateRangeOptions {
  readonly afternoonStart: Date
  readonly daypartQuery: CalendarEventQuery | null
  readonly end: Date
  readonly morningEnd: Date
  readonly now: Date
  readonly start: Date
  readonly text: string
}

export const createCalendarDateRange = ({
  afternoonStart,
  daypartQuery,
  end,
  morningEnd,
  now,
  start,
  text,
}: CreateCalendarDateRangeOptions): CalendarEventQuery => {
  if (includesRequestedMorning(text)) {
    return toRange(start, morningEnd)
  }

  if (text.includes('오후')) {
    const afternoonRangeStart =
      now.getTime() < afternoonStart.getTime() || now.getTime() >= end.getTime()
        ? afternoonStart
        : now
    return toRange(afternoonRangeStart, end)
  }

  if (daypartQuery !== null) {
    return daypartQuery
  }

  return toRange(start, end)
}

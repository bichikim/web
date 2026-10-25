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

/** Prepares omission of excluded time phrases followed by an explicit unexcluded replacement. */
export const createDaypartOmission = (daypartNames: readonly string[], boundary: RegExp) => {
  const names = ['오전', '오후', ...daypartNames]
  const patterns = names.map((name) => {
    const otherNames = names.filter((other) => other !== name).join('|')
    const excluded = createCalendarExclusionPattern(`(?:${otherNames})\\s*`)
    return {
      excludedReplacement: createCalendarExclusionPattern(`${name}\\s*`, otherNames),
      name,
      omitted: new RegExp(
        `(?<![\\p{L}\\p{N}_])(?:${excluded.source}\\s*)+(?=${name}${boundary.source})`,
        'gu',
      ),
    }
  })

  return (text: string): string =>
    patterns.reduce(
      (current, {excludedReplacement, name, omitted}) =>
        !current.includes(name) || excludedReplacement.test(current)
          ? current
          : current.replace(omitted, ''),
      text,
    )
}

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

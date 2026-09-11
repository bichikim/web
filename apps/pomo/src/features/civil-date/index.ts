import {dayjs} from 'src/utils/zoned-dayjs'
const KOREA_OFFSET_HOURS = 9
const DAY_MILLISECONDS = 86400000
const MONTHS_PER_YEAR = 12
const MAXIMUM_YEAR = 9999
const MINIMUM_YEAR = 100
const YEAR_DIGITS = 4
export interface CivilDate {
  readonly year: number
  readonly month: number
  readonly day: number
}

export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

export const formatDate = (date: CivilDate): string =>
  [
    String(date.year).padStart(YEAR_DIGITS, '0'),
    String(date.month).padStart(2, '0'),
    String(date.day).padStart(2, '0'),
  ].join('-')

export const parseDate = (value: string): CivilDate | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return null
  }
  const [year, month, day] = value.split('-').map(Number)
  if (
    year < MINIMUM_YEAR ||
    year > MAXIMUM_YEAR ||
    month < 1 ||
    month > MONTHS_PER_YEAR ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null
  }
  return {day, month, year}
}

export const dateEpoch = (date: CivilDate): number => Date.UTC(date.year, date.month - 1, date.day)

export const addDays = (date: CivilDate, count: number): CivilDate => {
  const next = new Date(dateEpoch(date) + count * DAY_MILLISECONDS)
  return {day: next.getUTCDate(), month: next.getUTCMonth() + 1, year: next.getUTCFullYear()}
}

/** Returns the final included day of a whole calendar-month period. */
export const periodEnd = (date: CivilDate, months: number): CivilDate => {
  const first = new Date(Date.UTC(date.year, date.month - 1 + months, 1))
  const year = first.getUTCFullYear()
  const month = first.getUTCMonth() + 1
  const last = daysInMonth(year, month)
  return date.day > last ? {day: last, month, year} : addDays({day: date.day, month, year}, -1)
}

export const koreanToday = (now: Date): string =>
  dayjs(now).utcOffset(KOREA_OFFSET_HOURS).format('YYYY-MM-DD')

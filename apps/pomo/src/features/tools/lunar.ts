import KoreanLunarCalendar from 'korean-lunar-calendar'
import {normalizePasteNumericInput} from 'src/utils/normalize-paste-numeric-input'
import {type CivilDate, daysInMonth, formatDate, parseDate} from '../civil-date'

const DAY_CYCLE = 10
const FIRST_MOVING_DAY = 9
const MONTH_COUNT = 12
const LAST_YEAR = 2050
const FIRST_YEAR = 1900
const MAXIMUM_LUNAR_DAY = 30
const LAST_SUPPORTED_LUNAR_DATE = {day: 18, month: 11, year: LAST_YEAR}
export interface LunarDate extends CivilDate {
  readonly leap: boolean
}
export interface GetConvertibleLunarDaysOptions {
  readonly leap: boolean
  readonly month: number
  readonly year: number
}
export type LunarToSolarResult =
  | {readonly status: 'converted'; readonly value: string}
  | {readonly status: 'invalid'}
  | {readonly status: 'unsupported'}

const isAfterLastSupportedLunarDate = (date: LunarDate): boolean => {
  if (date.year !== LAST_SUPPORTED_LUNAR_DATE.year) {
    return date.year > LAST_SUPPORTED_LUNAR_DATE.year
  }
  if (date.month !== LAST_SUPPORTED_LUNAR_DATE.month) {
    return date.month > LAST_SUPPORTED_LUNAR_DATE.month
  }
  return date.day > LAST_SUPPORTED_LUNAR_DATE.day
}

export const solarToLunar = (value: string): LunarDate | null => {
  const date = parseDate(normalizePasteNumericInput(value))
  if (date === null || date.year < FIRST_YEAR || date.year > LAST_YEAR) {
    return null
  }
  const calendar = new KoreanLunarCalendar()
  if (!calendar.setSolarDate(date.year, date.month, date.day)) {
    return null
  }
  const result = calendar.getLunarCalendar()
  return {
    day: result.day,
    leap: result.intercalation === true,
    month: result.month,
    year: result.year,
  }
}
const getLunarToSolarResultWithCalendar = (
  date: LunarDate,
  calendar: KoreanLunarCalendar,
): LunarToSolarResult => {
  if (
    ![date.year, date.month, date.day].every(Number.isInteger) ||
    date.month < 1 ||
    date.month > MONTH_COUNT ||
    date.day < 1 ||
    date.day > MAXIMUM_LUNAR_DAY
  ) {
    return {status: 'invalid'}
  }
  if (date.year < FIRST_YEAR - 1 || date.year > LAST_YEAR || isAfterLastSupportedLunarDate(date)) {
    return {status: 'unsupported'}
  }
  if (!calendar.setLunarDate(date.year, date.month, date.day, date.leap)) {
    return {status: 'invalid'}
  }
  const actual = calendar.getLunarCalendar()
  if (
    actual.year !== date.year ||
    actual.month !== date.month ||
    actual.day !== date.day ||
    (actual.intercalation === true) !== date.leap
  ) {
    return {status: 'invalid'}
  }
  const solar = calendar.getSolarCalendar()
  if (solar.year < FIRST_YEAR || solar.year > LAST_YEAR) {
    return {status: 'unsupported'}
  }
  return {status: 'converted', value: formatDate(solar)}
}

export const getLunarToSolarResult = (date: LunarDate): LunarToSolarResult =>
  getLunarToSolarResultWithCalendar(date, new KoreanLunarCalendar())

export const lunarToSolar = (date: LunarDate): string | null => {
  const result = getLunarToSolarResult(date)
  return result.status === 'converted' ? result.value : null
}

export const getConvertibleLunarDays = (
  options: GetConvertibleLunarDaysOptions,
): ReadonlyArray<number> => {
  const calendar = new KoreanLunarCalendar()
  return Array.from({length: MAXIMUM_LUNAR_DAY}, (_, index) => index + 1).filter((day) => {
    const result = getLunarToSolarResultWithCalendar(
      {
        day,
        leap: options.leap,
        month: options.month,
        year: options.year,
      },
      calendar,
    )
    return result.status === 'converted'
  })
}

export const getMovingDays = (year: number, month: number): ReadonlyArray<string> => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < FIRST_YEAR ||
    year > LAST_YEAR ||
    month < 1 ||
    month > MONTH_COUNT
  ) {
    return []
  }
  return Array.from({length: daysInMonth(year, month)}, (_, index) =>
    formatDate({day: index + 1, month, year}),
  ).filter((date) => {
    const lunar = solarToLunar(date)
    return (
      lunar !== null && (lunar.day % DAY_CYCLE === FIRST_MOVING_DAY || lunar.day % DAY_CYCLE === 0)
    )
  })
}

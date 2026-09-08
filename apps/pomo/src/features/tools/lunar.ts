import KoreanLunarCalendar from 'korean-lunar-calendar'
import {type CivilDate, daysInMonth, formatDate, parseDate} from '../civil-date'

const DAY_CYCLE = 10
const FIRST_MOVING_DAY = 9
const MONTH_COUNT = 12
const LAST_YEAR = 2050
const FIRST_YEAR = 1900
export interface LunarDate extends CivilDate {
  readonly leap: boolean
}
export const solarToLunar = (value: string): LunarDate | null => {
  const date = parseDate(value)
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
export const lunarToSolar = (date: LunarDate): string | null => {
  if (
    ![date.year, date.month, date.day].every(Number.isInteger) ||
    date.year < FIRST_YEAR - 1 ||
    date.year > LAST_YEAR
  ) {
    return null
  }
  const calendar = new KoreanLunarCalendar()
  if (!calendar.setLunarDate(date.year, date.month, date.day, date.leap)) {
    return null
  }
  const actual = calendar.getLunarCalendar()
  if (
    actual.year !== date.year ||
    actual.month !== date.month ||
    actual.day !== date.day ||
    (actual.intercalation === true) !== date.leap
  ) {
    return null
  }
  const solar = calendar.getSolarCalendar()
  return solar.year < FIRST_YEAR || solar.year > LAST_YEAR ? null : formatDate(solar)
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

import {parseDate} from '../civil-date'

const ALL_DAY_DATE_KEY_LENGTH = 'YYYY-MM-DD'.length
const getAllDayDateKey = (value: string): string => value.slice(0, ALL_DAY_DATE_KEY_LENGTH)

/** Returns a validated all-day date prefix, or null for an invalid calendar date. */
export const parseAllDayDateKey = (value: string): string | null => {
  const key = getAllDayDateKey(value)
  return parseDate(key) === null ? null : key
}

export const parseAllDayDate = (value: string) => parseDate(getAllDayDateKey(value))

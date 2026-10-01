import {z} from 'zod'
import {parseDate} from '../civil-date'
const DATE_SCHEMA = z.iso.date()
/** Returns a validated all-day date prefix, or null for an invalid calendar date. */
export const parseAllDayDateKey = (value: string): string | null =>
  DATE_SCHEMA.safeParse(value.slice(0, 'YYYY-MM-DD'.length)).data ?? null
export const parseAllDayDate = (value: string) => {
  const key = parseAllDayDateKey(value)
  return key === null ? null : parseDate(key)
}

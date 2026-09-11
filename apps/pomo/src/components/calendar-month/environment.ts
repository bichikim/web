import type {MonthEnvironment} from './use-month'
import {
  listCalendarEvents,
  readCalendarMonthCache,
  writeCalendarMonthCache,
} from 'src/features/calendar'

export const monthEnvironment: MonthEnvironment = {
  load: listCalendarEvents,
  now: () => new Date(),
  readCache: readCalendarMonthCache,
  reportError: (message, error) => console.error(message, error),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  writeCache: writeCalendarMonthCache,
}

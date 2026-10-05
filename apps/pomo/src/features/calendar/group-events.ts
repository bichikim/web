import {dayjs} from 'src/utils/zoned-dayjs'
import {parseAllDayDateKey} from './all-day-date'
import {parseTimedInterval} from './parse-timed-interval'
import type {CalendarEvent} from './types'

/**
 * Groups events with parseable end values and valid all-day start dates by covered visible dates,
 * excluding each exclusive end boundary.
 */
export const groupCalendarEvents = (
  events: ReadonlyArray<CalendarEvent>,
  visibleDates: ReadonlyArray<string>,
  timeZone: string,
): ReadonlyMap<string, ReadonlyArray<CalendarEvent>> => {
  const createDateKey = (timestamp: number) => dayjs(timestamp).tz(timeZone).format('YYYY-MM-DD')
  const grouped = new Map<string, CalendarEvent[]>()
  events.forEach((event) => {
    const endTimestamp = Date.parse(event.end)
    if (!Number.isFinite(endTimestamp)) {
      return
    }

    const startTimestamp = Date.parse(event.start)
    if (!event.allDay && parseTimedInterval(event.start, event.end) === null) {
      return
    }

    const start = event.allDay ? parseAllDayDateKey(event.start) : createDateKey(startTimestamp)
    if (start === null) {
      return
    }

    // All-day ends retain their date key; timed events use the last instant for local-day boundaries.
    const end = event.allDay ? parseAllDayDateKey(event.end) : createDateKey(endTimestamp - 1)
    if (end === null) {
      return
    }

    for (const date of visibleDates) {
      if (date >= start && (event.allDay ? date < end : date <= end)) {
        const entries = grouped.get(date)
        if (entries === undefined) {
          grouped.set(date, [event])
        } else {
          entries.push(event)
        }
      }
    }
  })
  return grouped
}

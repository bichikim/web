import {dayjs} from 'src/utils/zoned-dayjs'
import {z} from 'zod'
import type {CalendarEvent} from './types'

const calendarDateSchema = z.iso.date()

/**
 * Groups events with parseable end values and valid all-day start dates by covered visible dates,
 * excluding each end instant.
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
    if (Number.isNaN(endTimestamp)) {
      return
    }

    const start = event.allDay
      ? calendarDateSchema.safeParse(event.start).data
      : createDateKey(Date.parse(event.start))
    if (start === undefined) {
      return
    }

    // The last included instant keeps midnight and DST boundaries in the display time zone.
    const end = event.allDay ? event.end : createDateKey(endTimestamp - 1)
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

import {dayjs} from 'src/utils/zoned-dayjs'
import {z} from 'zod'
import type {CalendarEvent} from './types'

const calendarDateSchema = z.iso.date()

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
  const getAllDayDateKey = (date: string) =>
    calendarDateSchema.safeParse(date.slice(0, 'YYYY-MM-DD'.length)).data
  const grouped = new Map<string, CalendarEvent[]>()
  events.forEach((event) => {
    const endTimestamp = Date.parse(event.end)
    if (Number.isNaN(endTimestamp)) {
      return
    }

    const start = event.allDay
      ? getAllDayDateKey(event.start)
      : createDateKey(Date.parse(event.start))
    if (start === undefined) {
      return
    }

    // All-day ends retain their date key; timed events use the last instant for local-day boundaries.
    const end = event.allDay ? getAllDayDateKey(event.end) : createDateKey(endTimestamp - 1)
    if (end === undefined) {
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

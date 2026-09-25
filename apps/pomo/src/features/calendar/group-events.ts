import {dayjs} from 'src/utils/zoned-dayjs'
import type {CalendarEvent} from './types'

/** Groups events with parseable end values by covered visible dates, excluding each end instant. */
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

    const start = event.allDay ? event.start : createDateKey(Date.parse(event.start))
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

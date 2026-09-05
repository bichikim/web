import type {CalendarEvent} from './types'

const createDateKey = (formatter: Intl.DateTimeFormat, timestamp: number): string => {
  const parts = formatter.formatToParts(timestamp)
  const readPart = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${readPart('year')}-${readPart('month')}-${readPart('day')}`
}

/** Groups events by covered visible dates, excluding each event's end instant. */
export const groupCalendarEvents = (
  events: ReadonlyArray<CalendarEvent>,
  visibleDates: ReadonlyArray<string>,
  timeZone: string,
): ReadonlyMap<string, ReadonlyArray<CalendarEvent>> => {
  const formatter = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  })
  const grouped = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const start = event.allDay ? event.start : createDateKey(formatter, Date.parse(event.start))
    // The last included instant keeps midnight and DST boundaries in the display time zone.
    const end = event.allDay ? event.end : createDateKey(formatter, Date.parse(event.end) - 1)
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
  }
  return grouped
}

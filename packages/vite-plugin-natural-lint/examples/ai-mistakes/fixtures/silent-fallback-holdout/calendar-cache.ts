interface CalendarCache {
  readonly events: readonly string[]
}

interface CalendarStorage {
  readonly getItem: (key: string) => string | null
}

export const readCalendarCache = (storage: CalendarStorage): CalendarCache | null => {
  try {
    const stored = storage.getItem('calendar-cache')
    return stored === null ? null : (JSON.parse(stored) as CalendarCache)
  } catch {
    return null
  }
}

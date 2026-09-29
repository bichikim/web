const WEATHER_EXPIRY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/u

const hasValidCalendarDate = (value: string) => {
  const datePrefix = WEATHER_EXPIRY_DATE_PATTERN.exec(value)?.[0]
  if (datePrefix === undefined) {
    return false
  }

  const timestamp = Date.parse(datePrefix)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(datePrefix)
}

/** Returns a finite weather expiry timestamp, or null for malformed persisted data. */
export const parseWeatherExpiryMs = (expiresAt: string): number | null => {
  if (!hasValidCalendarDate(expiresAt)) {
    return null
  }

  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) ? timestamp : null
}

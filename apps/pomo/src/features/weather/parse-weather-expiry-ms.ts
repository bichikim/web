import {hasValidIsoCalendarDate} from 'src/utils/iso-calendar-date'

/** Returns a finite weather expiry timestamp, or null for malformed persisted data. */
export const parseWeatherExpiryMs = (expiresAt: string): number | null => {
  if (!hasValidIsoCalendarDate(expiresAt)) {
    return null
  }

  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) ? timestamp : null
}

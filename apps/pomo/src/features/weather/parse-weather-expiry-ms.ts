/** Returns a finite weather expiry timestamp, or null for malformed persisted data. */
export const parseWeatherExpiryMs = (expiresAt: string): number | null => {
  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) ? timestamp : null
}

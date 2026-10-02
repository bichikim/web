/** Checks the ISO calendar date prefix without normalizing impossible days. */
export const hasValidIsoCalendarDate = (value: string): boolean => {
  const prefix = /^\d{4}-\d{2}-\d{2}/u.exec(value)?.[0]
  if (prefix === undefined) {
    return false
  }
  const timestamp = Date.parse(prefix)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(prefix)
}

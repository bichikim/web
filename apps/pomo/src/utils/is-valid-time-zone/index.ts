/** Returns whether Intl accepts the time zone identifier. */
export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en', {timeZone}).resolvedOptions()
    return true
  } catch {
    return false
  }
}

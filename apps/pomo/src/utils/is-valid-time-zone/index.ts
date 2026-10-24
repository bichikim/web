/** Intl이 시간대 식별자를 허용하는지 반환한다. */
export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en', {timeZone}).resolvedOptions()
    return true
  } catch {
    return false
  }
}

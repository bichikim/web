import {memoize} from 'es-toolkit/function'

const MAXIMUM_CACHED_TIME_ZONES = 256

const validateTimeZone = memoize((timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en', {timeZone}).resolvedOptions()
    return true
  } catch {
    return false
  }
})

/** Intl이 시간대 식별자를 허용하는지 반환하며 같은 문자열의 검증 결과를 재사용한다. */
export const isValidTimeZone = (timeZone: string): boolean => {
  if (
    validateTimeZone.cache.size >= MAXIMUM_CACHED_TIME_ZONES &&
    !validateTimeZone.cache.has(timeZone)
  ) {
    validateTimeZone.cache.clear()
  }

  return validateTimeZone(timeZone)
}

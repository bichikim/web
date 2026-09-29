/** Parses the positive integer seconds form of an HTTP Retry-After header. */
export const parseRetryAfterSeconds = (header: string | null): number | null => {
  if (header === null) {
    return null
  }

  const normalizedHeader = header.trim()
  if (!/^[0-9]+$/u.test(normalizedHeader)) {
    return null
  }

  const seconds = Number(normalizedHeader)

  return Number.isInteger(seconds) && seconds > 0 ? seconds : null
}

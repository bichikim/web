/** Parses the positive integer seconds form of an HTTP Retry-After header. */
export const parseRetryAfterSeconds = (header: string | null): number | null => {
  if (header === null) {
    return null
  }

  const seconds = Number(header)

  return Number.isInteger(seconds) && seconds > 0 ? seconds : null
}

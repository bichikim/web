/** Returns an Error instance's message, including empty strings, or evaluates the fallback. */
export const getExceptionMessage = (error: unknown, fallback: string | (() => string)): string => {
  if (error instanceof Error) {
    return error.message
  }
  return typeof fallback === 'function' ? fallback() : fallback
}

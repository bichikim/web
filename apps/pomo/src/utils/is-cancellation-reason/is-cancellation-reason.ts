/** Identifies an AbortError by its standard name across runtime error classes. */
export const isAbortError = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'name' in value && value.name === 'AbortError'

/** Identifies an AbortError or the exact reason of an aborted signal. */
export const isCancellationReason = (value: unknown, signal?: AbortSignal | null): boolean =>
  isAbortError(value) || (signal?.aborted === true && value === signal.reason)

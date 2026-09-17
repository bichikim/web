import {isObject} from 'src/utils/is-object'

/** Returns a non-empty error message, the fallback, or null. */
export function getErrorMessage(error: unknown): string | null
export function getErrorMessage(error: unknown, fallback: string): string
export function getErrorMessage(error: unknown, fallback?: string): string | null {
  try {
    if (isObject(error)) {
      const message = Reflect.get(error, 'message')

      if (typeof message === 'string' && message.length > 0) {
        return message
      }
    }
  } catch {
    return fallback ?? null
  }

  return fallback ?? null
}

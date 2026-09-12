import {isObject} from 'src/utils/is-object'

const getMessage = (value: unknown): string | null => {
  try {
    if (!isObject(value)) {
      return null
    }

    const message = Reflect.get(value, 'message')
    return typeof message === 'string' && message.length > 0 ? message : null
  } catch {
    return null
  }
}

/** Returns a non-empty error message or the caller-provided fallback. */
export const getErrorMessage = (error: unknown, fallback: string): string =>
  getMessage(error) ?? fallback

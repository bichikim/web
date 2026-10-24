import {isObject} from 'src/utils/is-object'

/** 비어 있지 않은 오류 메시지나 대체값 또는 null을 반환한다. */
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

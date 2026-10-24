import {isNil} from 'es-toolkit/predicate'

/**
 * Promise-like 객체인지 확인합니다.
 *
 * `then`, `catch`, `finally` 메서드를 모두 가진 객체를 검사합니다.
 */
export const isPromise = (value: unknown): value is Promise<unknown> => {
  if (isNil(value)) {
    return false
  }

  if (typeof value !== 'object') {
    return false
  }

  try {
    return (
      typeof Reflect.get(value, 'then') === 'function' &&
      typeof Reflect.get(value, 'catch') === 'function' &&
      typeof Reflect.get(value, 'finally') === 'function'
    )
  } catch {
    return false
  }
}

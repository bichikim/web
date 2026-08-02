import {isNil} from 'es-toolkit/predicate'

export type ToBePromiseType<T> = T extends {
  catch: (...arg: any) => any
  finally: (...arg: any) => any
  then: (value: infer U) => any
}
  ? Promise<U>
  : never

/**
 * Promise-like 객체인지 확인합니다.
 *
 * `then`, `catch`, `finally` 메서드를 모두 가진 객체를 검사합니다.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const isPromise = <T>(value: T): value is ToBePromiseType<T> => {
  if (isNil(value)) {
    return false
  }

  return (
    typeof value === 'object' &&
    typeof (value as any).then === 'function' &&
    typeof (value as any).catch === 'function' &&
    typeof (value as any).finally === 'function'
  )
}

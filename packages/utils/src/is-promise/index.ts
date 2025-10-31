import {isNil} from 'es-toolkit/compat'

export type ToBePromiseType<T> = T extends {
  catch: (...arg: any) => any
  finally: (...arg: any) => any
  then: (value: infer U) => any
}
  ? Promise<U>
  : never

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

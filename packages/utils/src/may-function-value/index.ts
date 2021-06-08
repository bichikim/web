export type MayFunction<T> = T | (() => T)

export type ReturnFunction<T> = (...args: any[]) => T

export type UnFunction<T> = T extends ReturnFunction<infer P> ? P : T

export const mayFunctionValue = <T extends MayFunction<any>>(value: T): UnFunction<T> => {
  if (typeof value === 'function') {
    return value()
  }
  return value as any
}

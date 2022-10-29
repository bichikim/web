import {MaybeFunction, MaybeFunctionParams} from 'src/types'
export type FunctionReturnType<T> = (...args: any[]) => T
export type UnFunction<T> = T extends FunctionReturnType<infer P> ? P : T

/**
 * get value from () => value or not
 * @param value
 */
export function toValue<T>(value: T): UnFunction<T>
export function toValue<T>(value: () => T): UnFunction<T>
export function toValue<T extends MaybeFunction<any>>(
  value: T,
  args: MaybeFunctionParams<T>,
): UnFunction<T>
export function toValue<T>(value: T, args?: any): UnFunction<T> {
  if (typeof value === 'function') {
    return value(...(args ?? []))
  }
  return value as any
}

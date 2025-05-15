import {AnyFunction, MaybeFunction} from 'src/types'

export type MaybeParameters<T> = T extends (...args: unknown[]) => unknown ? Parameters<T> : unknown
export type MaybeReturnType<T> = T extends (...args: unknown[]) => unknown ? ReturnType<T> : T

export function toValue<T>(value: MaybeFunction<T>): T
export function toValue<T, Args extends unknown[]>(value: AnyFunction<Args, T>, args: Args): T
export function toValue<T>(value: T): T

export function toValue(value: any, args?: any[]) {
  if (typeof value === 'function') {
    return value(...(args ?? []))
  }

  return value
}

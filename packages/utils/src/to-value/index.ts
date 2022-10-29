import {MaybeFunction} from 'src/types'

export type MaybeParameters<T> = T extends (...args: any) => any ? Parameters<T> : unknown
export type MaybeReturnType<T> = T extends (...args: any) => any ? ReturnType<T> : T

export function toValue<T>(value: () => T): T
export function toValue<T, Args extends any[] = any[]>(value: MaybeFunction<T>, args: Args): T
export function toValue<T>(value: MaybeFunction<T>): T
export function toValue<T>(value: T): T
export function toValue(value, args?) {
  if (typeof value === 'function') {
    return (value as any)(...(args ?? []))
  }
  return value as any
}

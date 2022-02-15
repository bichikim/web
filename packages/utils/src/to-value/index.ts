export type MayFunction<T> = T | ((...args: any) => T)
export type ReturnFunction<T> = (...args: any[]) => T
export type UnFunction<T> = T extends ReturnFunction<infer P> ? P : T

/**
 * @param value
 */
export function toValue<T>(value: T)
export function toValue<T>(value: () => T)
export function toValue<T, Args extends any[]>(value: (...args: Args) => T, args: Args)
export function toValue<T>(value: T, args?: any): UnFunction<T> {
  if (typeof value === 'function') {
    return value(...args ?? [])
  }
  return value as any
}

/**
 * @deprecated
 * @param value
 */
export const getFunctionValue = toValue

/**
 * @deprecated
 * @param value
 */
export const mayFunctionValue = toValue
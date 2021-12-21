export type MayFunction<T> = T | ((...args: any) => T)
export type ReturnFunction<T> = (...args: any[]) => T
export type UnFunction<T> = T extends ReturnFunction<infer P> ? P : T

export function mayFunctionValue<T>(value: T)
export function mayFunctionValue<T>(value: () => T)
export function mayFunctionValue<T, Args extends any[]>(value: (...args: Args) => T, args: Args)
export function mayFunctionValue<T>(value: T, args?: any): UnFunction<T> {
  if (typeof value === 'function') {
    return value(...args ?? [])
  }
  return value as any
}

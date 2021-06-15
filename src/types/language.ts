// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmptyObject {
  // empty
}

export type PartialRequired<T, K extends keyof T> = {
  [P in K]-?: T[P]
} & {
  [P in Exclude<keyof T, K>]: T[P]
}

export type AnyObject = Record<string | symbol | number, any>

export type PureObject = Record<string, any>

export type AnyFunction<A extends any[] = any[], R = any> = (...args: A) => R

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmptyObject {
  // empty
}

export type NotUndefined<T> = T extends undefined ? never : T

export type AnyFunction<Args extends any[] = any[], Return = any> = (...args: Args) => Return

export type FunctionObject<T extends Record<string, AnyFunction>> = {
  [P in keyof T]: (...args: Parameters<T[P]>) => ReturnType<T[P]>
}

export type PatchRequired<T, K extends keyof T> = {
  [P in K]-?: T[P]
} & {
  [P in Exclude<keyof T, K>]: T[P]
}

export type PatchOptional<T, K extends keyof T> = {
  [P in K]?: T[P]
} & {
  [P in Exclude<keyof T, K>]: T[P]
}

export type MayPromise<T> = Promise<T> | T

export type PromiseType<T> = T extends Promise<infer P> ? P : T

export type PromiseReturnType<T extends AnyFunction> = PromiseType<ReturnType<T>>

export type MayArray<T> = T | Array<T>

export type ArrayOrOne<T> = T extends (infer P)[] ? P[] : [T]

export type ObjectKey = string | symbol | number

export type AnyObject<Value = any> = Record<ObjectKey, Value>

export type PureObject<Value = any> = Record<string, Value>

export type DropTuple<T extends any[], S = any> = T extends [S, ...infer Rest] ? Rest : any[]

export type DropParameters<T extends (...args: any) => any, S = any> = DropTuple<Parameters<T>, S>

export type DropParametersFunction<T extends (...args: any) => any> = AnyFunction<DropParameters<T>, ReturnType<T>>

export type DropRightTuple<T extends any[]> = T extends [...infer Head, any] ? Head : any[]

export type PickLastTuple<T extends any[]> = T extends [...any[], infer P] ? P : unknown

export type DropRightParameters<T extends (...args: any) => any> = DropRightTuple<Parameters<T>>

export type PickLastParameters<T extends (...args: any) => any> = PickLastTuple<Parameters<T>>

export type DropRightParametersFunction<T extends (...args: any) => any> = AnyFunction<DropParameters<T>, ReturnType<T>>

export type PopTuple<T extends any[]> = T extends [...any, infer Last] ? Last : any

export type ShiftTuple<T extends any[]> = T extends [infer First, ...any] ? First : any

export type GetArrayLength<T extends any[]> = T extends {length: infer Length} ? Length : never

export type HasTail<T extends any[]> = T extends ([] | [any]) ? false : true

export type UnShiftTuple<First, T extends any[]> = [First, ...T]

export type PushTuple<T extends any[], Last> = [...T, Last]

export type Keyof<R> = R extends Record<infer P, any> ? P : never
export type TakeFlatKeys<R, K extends keyof R> = R extends Record<K, infer P> ? Keyof<P> : never
export type FlatKeys<R> = TakeFlatKeys<R, keyof R>


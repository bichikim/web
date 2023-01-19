// maybe ======================================
export type MaybePromise<T> = Promise<T> | T
export type MaybeArray<T> = T | Array<T>
export type MaybeFunction<T, Args extends any[] = any[]> = T | ((...args: Args) => T)
export type MaybeFunctionParams<T> = T extends (...args: infer P) => any ? P : []
// ============================================

// object =====================================
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmptyObject {
  // empty
}

export type ObjectKey = string | number | symbol
export type PureObject<Value = unknown> = Record<ObjectKey, Value>
export type StringKeyObject<Value = any> = Record<string, Value>
export type Data<Value = unknown> = Record<string, Value>
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
// ============================================

// array ======================================
export type Drop<T extends any[], S = any> = T extends [S, ...infer Rest] ? Rest : any[]
export type DropRight<T extends any[]> = T extends [...infer Head, any] ? Head : any[]
export type Push<T extends Array<any>, E> = [...T, E]
export type Pop<T extends any[]> = T extends [...any[], infer P] ? P : unknown
export type Unshift<T extends Array<any>, E> = [E, ...T]
export type Shift<T extends any[]> = T extends [infer First, ...any] ? First : any
export type Concat<T1 extends Array<any>, T2 extends Array<any>> = [...T1, ...T2]
export type ArrayLength<T extends any[]> = T extends {length: infer L} ? L : never
export type Tail<T extends Array<any>> = ((...t: T) => void) extends (
  h: any,
  ...rest: infer R
) => void
  ? R
  : never
// ============================================

// not ========================================
export type NotUndefined<T> = T extends undefined ? never : T
export type NotFunction = object | number | string | boolean | symbol | null | undefined
// ============================================

// any ========================================
export type AnyFunction<Args extends any[] = any[], Return = any> = (...args: Args) => Return
// ============================================

// promise ====================================
export type PromiseType<T> = T extends Promise<infer P> ? P : T

export type PromiseReturnType<T extends AnyFunction> = PromiseType<ReturnType<T>>
// ============================================

// parameters =================================
export type DropParameters<T extends (...args: any) => any, S = any> = Drop<Parameters<T>, S>
export type DropRightParameters<T extends (...args: any) => any> = DropRight<Parameters<T>>
export type PopParameters<T extends (...args: any) => any> = Pop<Parameters<T>>
// ============================================

// type assistants ============================
export type TakeFlatKeys<R, K extends keyof R> = R extends Record<K, infer P> ? Keyof<P> : never
// ============================================

export type FunctionObject<T extends Record<string, AnyFunction>> = {
  [P in keyof T]: (...args: Parameters<T[P]>) => ReturnType<T[P]>
}

export type ArrayOrOne<T> = T extends (infer P)[] ? P[] : [T]

// ->
export type DropParametersFunction<T extends (...args: any) => any> = AnyFunction<
  DropParameters<T>,
  ReturnType<T>
>

export type DropRightParametersFunction<T extends (...args: any) => any> = AnyFunction<
  DropParameters<T>,
  ReturnType<T>
>

export type Keyof<R> = R extends Record<infer P, any> ? P : never

export type FlatKeys<R> = TakeFlatKeys<R, keyof R>

// eslint-disable-next-line @typescript-eslint/ban-types
export type ClassFunction = Function

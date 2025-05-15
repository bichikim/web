// maybe ======================================
/**
 * @example
 * const foo: MaybePromise<string> = 'foo' // true
 * const foo: MaybePromise<string> = Promise.resolve('foo') // true
 */
export type MaybePromise<T> = Promise<T> | T

/**
 * @example
 * const foo: MaybeArray<string> = 'foo' // true
 * const foo: MaybeArray<string> = ['foo', 'bar'] // true
 */
export type MaybeArray<T> = Array<T> | T

/**
 * @example
 * const foo: MaybeFunction<T> = 'foo' //true
 * const foo:  MaybeFunction<T> = () => 'foo' // true
 * const foo:  MaybeFunction<T> = (value: number) => `${value}` // true
 */
export type MaybeFunction<T> = T | ((...args: any[]) => T)
/**
 * @example
 * const fooFunction = (foo: string, age: number) => `${foo} ${age}`
 * const foo: MaybeFunctionParams<typeof fooFunction> = ['foo', 20] // true
 * const foo: MaybeFunctionParams<typeof fooFunction> = [] // true
 */
export type MaybeFunctionParams<T> = T extends (...args: infer P) => any ? P : never[]
// ============================================

// object =====================================
/**
 * @example
 * const foo: EmptyObject = {} // true
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmptyObject {
  // empty
}

/**
 *all possible object keys
 * @example
 * const foo: ObjectKey[] = Object.keys({[Symbol()]: '', 5: '', 'foo': 5}) // true
 */
export type ObjectKey = string | number | symbol

/**
 * an object
 */
export type PureObject<Value = unknown> = Record<ObjectKey, Value>

/**
 * an object has only string key
 */
export type StringKeyObject<Value = unknown> = Record<string, Value>
/**
 * Something like fetch data
 */
export type Data<Value = unknown> = StringKeyObject<Value>

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
/**
 * remove a first item in the array
 */
export type Drop<T extends any[], S = any> = T extends [S, ...infer Rest] ? Rest : any[]
/**
 * remove a last item type in the array
 */
export type DropRight<T extends any[]> = T extends [...infer Head, any] ? Head : any[]
/**
 * add an item type at the end of the array
 */
export type Push<T extends Array<any>, E> = [...T, E]
/**
 * take a last item type in the array
 */
export type Pop<T extends any[]> = T extends [...any[], infer P] ? P : unknown
/**
 * add an item type at the start of the array
 */
export type Unshift<T extends Array<any>, E> = [E, ...T]
/**
 * take a first item type in the array
 */
export type Shift<T extends any[]> = T extends [infer First, ...any] ? First : any
/**
 * join two array
 */
export type Concat<T1 extends Array<any>, T2 extends Array<any>> = [...T1, ...T2]
/**
 * take Array length of type
 */
export type ArrayLength<T extends any[]> = T extends {length: infer L} ? L : never
// ============================================

// not ========================================
export type NotUndefined<T> = T extends undefined ? never : T
export type NotNull<T> = T extends null ? never : T
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
export type DropParametersFunction<T extends (...args: any) => any> = AnyFunction<DropParameters<T>, ReturnType<T>>

export type DropRightParametersFunction<T extends (...args: any) => any> = AnyFunction<DropParameters<T>, ReturnType<T>>

export type Keyof<R> = R extends Record<infer P, any> ? P : never

export type FlatKeys<R> = TakeFlatKeys<R, keyof R>

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ClassFunction = Function

export type SnakeToCamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${SnakeToCamelCase<P3>}`
  : Lowercase<S>

export type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
  : S

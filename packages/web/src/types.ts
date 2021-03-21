import {Ref, UnwrapRef} from 'vue'

export type AnyFunction<A extends any[] = any[], R = any> = (...args: A) => R
export type OneAndAnyFunc<T, A extends any[] = any[], R = any> = (one: T, ...args: A) => R
export type ObjectKey = string | number | symbol
export type AnyObject<T = any> = Record<ObjectKey, T>
export type PromiseAnyFunc = (...args: any[]) => PromiseLike<any> | any
export type State<S> = S extends Ref ? S : UnwrapRef<S>
export type DropParameters<T extends (...args: any) => any, S = any> = T extends (a: S, ...args: infer P) => any ? P : never;
export type ReturnFunction<R, A extends Array<any> = Array<any>> = (...args: A) => R
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRef<T>

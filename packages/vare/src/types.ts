import {Ref, UnwrapRef} from 'vue-demi'
import {AnyFunction, DropParameters} from '@winter-love/utils'

export type OneAndAnyFunc<T, A extends any[] = any[], R = any> = (one: T, ...args: A) => R
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRef<T>
export type DropFunctionObject<T extends Record<string, AnyFunction>, S = any> = {
  [P in keyof T]: (...args: DropParameters<T[P], S>) => ReturnType<T[P]>
}


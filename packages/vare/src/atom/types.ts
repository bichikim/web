import {UnwrapNestedRefs} from '@winter-love/use'
import {AnyFunction, DropParameters} from '@winter-love/utils'
import {ComputedRef, Ref} from 'vue-demi'

export type AtomRecipe<T extends UnwrapNestedRefs<any>, Args extends any[] = any[]> =
  (state: T, ...args: Args) => unknown

export type AtomGetterRecipe<T extends UnwrapNestedRefs<any>, Return> = (state: T) => Return

export const AtomSymbol = Symbol('atom')
export const ActionWatchSymbol = Symbol('atom action watch')
export const GetterSymbol = Symbol('getter')
export const AtomComputedRefSymbol = Symbol('atom computed ref')
export const ActionSymbol = Symbol('action symbol')

export type GetterRecipe<Return> = (state) => Return

export type GetterRecipeInside<Return> = GetterRecipe<Return> & {
  [GetterSymbol]: true
}

export type AtomType<T> = UnwrapNestedRefs<T> & {
  [ActionWatchSymbol]: any
  [AtomSymbol]: true
}

export type CheckPromise<T extends Promise<unknown> | unknown> =
  T extends Promise<any> ? Promise<boolean> : boolean

export type AtomTypeWithRecipe<
  State,
  Recipe extends AtomRecipe<UnwrapNestedRefs<State>> | AtomGetterRecipe<UnwrapNestedRefs<State>, unknown>
  > = AtomType<State> & {
  readonly $: Recipe extends {[GetterSymbol]: true}
    ? (ComputedRef<ReturnType<Recipe>>)
    : ((...args: DropParameters<Recipe>) => unknown)
}

export interface Getter<T> {
  readonly value: T
}

export type AtomReturnTree<T extends Record<string, AnyFunction>, S = any> = {
  [P in keyof T]: T[P] extends {[GetterSymbol]: true}
    ? (Getter<ReturnType<T[P]>>)
    : ((...args: DropParameters<T[P], S>) => ReturnType<T[P]>)
}

export type AtomTypeWithRecipeTree<State extends Record<string, any>,
  Recipe extends AtomRecipe<UnwrapNestedRefs<State>>,
  TreeOptions extends Record<string, Recipe>> = AtomType<State> & {
  readonly $: AtomReturnTree<TreeOptions>
}

export type Atom<State> =
  | AtomType<State>
  //
  | AtomTypeWithRecipe<State, AtomRecipe<UnwrapNestedRefs<State>> | AtomGetterRecipe<UnwrapNestedRefs<State>, unknown>>
  //
  | AtomTypeWithRecipeTree<State, AtomRecipe<UnwrapNestedRefs<State>>
  | AtomGetterRecipe<UnwrapNestedRefs<State>, unknown>, Record<string, AtomRecipe<UnwrapNestedRefs<State>>
  | AtomGetterRecipe<UnwrapNestedRefs<State>, unknown>>>

export type AtomIdentifierName = 'atom'

export type _MayAtomType<State> =
  | State
  | UnwrapNestedRefs<State>
  | AtomType<State>
  | AtomTypeWithRecipe<State, AtomRecipe<UnwrapNestedRefs<State>>
  | AtomGetterRecipe<UnwrapNestedRefs<State>, unknown>>
  | Ref<State>

export type MayAtomType<State> =
  | (() => _MayAtomType<State>)
  | _MayAtomType<State>


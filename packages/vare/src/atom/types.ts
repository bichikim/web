import {DropParameters} from '@winter-love/utils'
import {ComputedRef, Ref, UnwrapNestedRefs} from 'vue-demi'

export type AtomRecipe<T, Args extends any[] = any[]> =
  (state: T, ...args: Args) => unknown

export type AtomGetterRecipe<T> = (state: T) => unknown

export const AtomSymbol = Symbol('atom')
export const ActionWatchSymbol = Symbol('atom action watch')
export const GetterSymbol = Symbol('getter')
export const AtomComputedRefSymbol = Symbol('atom computed ref')
export const ActionSymbol = Symbol('action symbol')

export type GetterRecipe<State, Return> = (state: State) => Return

export type GetterRecipeInside<State, Return> = GetterRecipe<State, Return> & {
  [GetterSymbol]: true
  __isGetter?: never
}

export type AtomType<T> = UnwrapNestedRefs<T> & {
  [ActionWatchSymbol]: any
  [AtomSymbol]: true
}

export type CheckPromise<T extends Promise<unknown> | unknown> =
  T extends Promise<any> ? Promise<boolean> : boolean

export type AtomTypeWithRecipe<State,
  Recipe extends AtomRecipe<State> | GetterRecipeInside<State, unknown>> = AtomType<State> & {
  readonly $: Recipe extends GetterRecipeInside<State, unknown>
    ? (ComputedRef<ReturnType<Recipe>>)
    : ((...args: DropParameters<Recipe>) => ReturnType<Recipe>)
}

export interface Getter<T> {
  readonly value: T
}

export type Recipe<State> = AtomRecipe<State> | AtomGetterRecipe<State>

export type AtomReturnTree<State, T extends Record<string, Recipe<State>>> = {
  [P in keyof T]: T[P] extends GetterRecipeInside<State, unknown>
    ? (Getter<ReturnType<T[P]>>)
    : ((...args: DropParameters<T[P], State>) => ReturnType<T[P]>)
}

export type AtomTypeWithRecipeTree<State extends Record<string, any>,
  TreeOptions extends Record<string, Recipe<State>>> = UnwrapNestedRefs<State> & {
  readonly $: AtomReturnTree<State, TreeOptions>
}

export type Atom<State> =
  | AtomType<State>
  //
  | AtomTypeWithRecipe<State, AtomRecipe<State> | AtomGetterRecipe<State>>
  //
  | AtomTypeWithRecipeTree<State, Record<string, Recipe<State>>>

export type AtomIdentifierName = 'atom'

export type _MayAtomType<State> =
  | State
  | UnwrapNestedRefs<State>
  | AtomType<State>
  | AtomTypeWithRecipe<State, AtomRecipe<State>
  | AtomGetterRecipe<State>>
  | Ref<State>

export type MayAtomType<State> =
  | (() => _MayAtomType<State>)
  | _MayAtomType<State>


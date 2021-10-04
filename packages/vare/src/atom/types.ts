import {UnwrapNestedRefs} from '@winter-love/use'
import {DropFunctionObject} from 'src/types'
import {Ref} from 'vue-demi'

export type AtomRecipe<T extends UnwrapNestedRefs<any>, Args extends any[] = any[]> =
  (state: T, ...args: Args) => unknown

export const AtomSymbol = Symbol('atom')
export const ActionSymbol = Symbol('atom action')

export type AtomType<T> = UnwrapNestedRefs<T> & {
  [ActionSymbol]: any
  [AtomSymbol]: true
}

export type CheckPromise<T extends Promise<unknown> | unknown> =
  T extends Promise<any> ? Promise<boolean> : boolean

export type AtomTypeWithRecipe<State, Args extends any[]> = AtomType<State> & {
  readonly $: (...args: Args) => unknown
}

export type AtomTypeWithRecipeTree<State extends Record<string, any>,
  Recipe extends AtomRecipe<UnwrapNestedRefs<State>>,
  TreeOptions extends Record<string, Recipe>> = AtomType<State> & {
  readonly $: DropFunctionObject<TreeOptions>
}

export type Atom<State> = AtomType<State> | AtomTypeWithRecipe<State, any[]>

export type AtomIdentifierName = 'atom'

export type MayAtomType<State> =
  State | UnwrapNestedRefs<State> | AtomType<State> | AtomTypeWithRecipe<State, any[]> | Ref<State>


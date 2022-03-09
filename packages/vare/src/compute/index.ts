
import {AnyFunction, DropParameters} from '@winter-love/utils'
import {useInfo} from 'src/info'
import {computed, ComputedRef, WritableComputedRef} from 'vue-demi'
import {UnwrapNestedRefs} from 'src/types'
import {ComputedRefSymbol, ComputeSymbol} from './symbol'
import {createGetAtomPrams, createUuid} from 'src/utils'

export {ComputeSymbol, ComputedRefSymbol}

export type ComputationRefRecipe<Return = any> = () => Return
export type ComputationStateRefRecipe<S, Return = any> = (state: S) => Return
export type ComputationRecipe<Args extends any[] = any, Return = any> = (...args: Args) => Return
export type ComputationStateRecipe<S, Args extends any[] = any, Return = any> = (state: S, ...args: Args) => Return
export type ComputationGetter<Args extends any[], Return> = (...args: Args) => Return
export type ComputationSetter<Args extends any[], Value> = (value: Value, ...args: Args) => any
export type ComputationRefGetter<Return> = () => Return
export type ComputationRefSetter<Value> = (value: Value) => any
export type ComputationStateRefGetter<S, Return> = (state: S) => Return
export type ComputationStateRefSetter<S, Value> = (state: S, value: Value) => any
export type ComputationSetterWithState<S, Args extends any[], Value> = (state: S, value: Value, ...args: Args) => any

export interface ComputationStateRecipeRefOptions<S, Return = any> {
  get: ComputationStateRefGetter<S, Return>
  set: ComputationStateRefSetter<S, Return>
}

export interface ComputationRecipeRefOptions<Return = any> {
  get: ComputationRefGetter<Return>
  set: ComputationRefSetter<Return>
}

export interface ComputationRecipeOptions<Args extends any[] = any, Return = any> {
  get: ComputationGetter<Args, Return>
  set: ComputationSetter<Args, Return>
}

export interface ComputationRecipeOptionsWithState<S, Args extends any[], Return> {
  get: ComputationGetter<[S, ...Args], Return>
  set: ComputationSetterWithState<S, Args, Return>
}

export type ComputeName = 'compute'
export type ComputeRefName = 'compute-ref'

export const computeName: ComputeName = 'compute'
export const computeRefName: ComputeRefName = 'compute-ref'

export type ComputationType = 'getter' | 'getter & setter'

export type Compute<Args extends any[], T> = ((...args: Args) => ComputedRef<T>) & {
  [ComputeSymbol]: boolean
}
export type ComputeWritable<Args extends any[], T> = ((...args: Args) => WritableComputedRef<T>) & {
  [ComputeSymbol]: boolean
}

export const isCompute = (value?: any): value is Compute<any[], any> | ComputeWritable<any[], any> => (
  Boolean(value?.[ComputeSymbol])
)

export const isComputedRef = (value?: any): value is ComputedRef | WritableComputedRef<any> => (
  Boolean(value?.[ComputedRefSymbol])
)

const isRecipeOption = (value?: any): value is ComputationRecipe => (
  typeof value === 'function' ||
  (typeof value === 'object' && typeof value.get === 'function' && typeof value.set === 'function')
)

// eslint-disable-next-line max-statements
const getComputePrams = createGetAtomPrams(createUuid('compute'), isRecipeOption)

function createFunctionComputed(unknown: any, mayRecipe?: any, name?: string, ref: boolean = false): any {
  const {state, name: _name, recipe} = getComputePrams(unknown, mayRecipe, name)

  let self = (...args: Readonly<any[]>): any => {
    let computedValue

    const getArgs = state ? [state, ...args] : [...args]
    const setArgs = (value) => (state ? [state, value, ...args] : [value, ...args])

    // ComputationRecipe type
    if (typeof recipe === 'function') {
      computedValue = computed(() => recipe(...getArgs))
    } else {
      // ComputationRecipeOptions type
      computedValue = computed({
        get: () => recipe.get(...getArgs),
        set: (value) => recipe.set(...setArgs(value)),
      })
    }

    return computedValue
  }

  // execute compute function to get computedRef
  if (ref) {
    self = self()
    self[ComputedRefSymbol] = true
  } else {
    self[ComputeSymbol] = true
  }

  if (process.env.NODE_ENV === 'development') {
    const info = useInfo()
    info.set(self, {
      kind: computeName,
      name: _name,
      type: typeof recipe === 'function' ? 'getter' : 'getter & setter',
    })

    if (state) {
      info.set(state, {
        relates: new Map([[_name, self]]),
      }, state)
    }
  }

  return self
}

function createTreeCompute(mayState: any, mayTree?, ref: boolean = false) {
  let tree
  let state
  if (mayTree) {
    tree = mayTree
    state = mayState
  } else {
    tree = mayState
  }

  return Object.keys(tree).reduce((result, name) => {
    const value = tree[name]
    if (state) {
      result[name] = createFunctionComputed(state, value, name, ref)
    } else {
      result[name] = createFunctionComputed(value, name, undefined, ref)
    }
    return result
  }, {} as Record<any, any>)
}

export type ComputeTree<T extends Record<string, AnyFunction>> = {
  [P in keyof T]: (...args: Parameters<T[P]>) => ComputedRef<ReturnType<T[P]>>
}

export type ComputeRefTree<T extends Record<string, AnyFunction>> = {
  [P in keyof T]: ComputedRef<ReturnType<T[P]>>
}

export type ComputeRefWritableTree<T extends Record<string, AnyFunction>> = {
  [P in keyof T]: ComputedRef<ReturnType<T[P]>>
}

export type ComputeTreeDrop<T extends Record<string, AnyFunction>, S = any> = {
  [P in keyof T]: (...args: DropParameters<T[P], S>) => ComputedRef<ReturnType<T[P]>>
}

export function createComputed(unknown: any, mayTree?, name?: string, ref: boolean = false): any {
  if (
    typeof unknown === 'function'
    || isRecipeOption(unknown)
    || typeof mayTree === 'function'
    || isRecipeOption(mayTree)) {
    return createFunctionComputed(unknown, mayTree, name, ref)
  }
  return createTreeCompute(unknown, mayTree, ref)
}

/**
 * return (...args) => computedRef
 * @deprecated
 * @param recipe
 * @param name
 */
export function compute<Args extends any[], T>(
  recipe: ComputationRecipe<Args, T>,
  name?: string,
): Compute<Args, T>
export function compute<S extends UnwrapNestedRefs<any>, Args extends any[], T>(
  state: S,
  recipe: ComputationRecipe<[S, ...Args], T>,
  name?: string,
): Compute<Args, T>
export function compute<Args extends any[], T>(
  recipe: ComputationRecipeOptions<Args, T>,
  name?: string,
): ComputeWritable<Args, T>
export function compute<S extends UnwrapNestedRefs<any>, Args extends any[], T>(
  state: S,
  recipe: ComputationRecipeOptionsWithState<S, Args, T>,
  name?: string,
): ComputeWritable<Args, T>
export function compute<Func extends ComputationRecipe, TreeOptions extends Record<string, Func>>(
  tree: TreeOptions,
): ComputeTree<TreeOptions>
export function compute<S extends UnwrapNestedRefs<any>,
  Func extends ComputationStateRecipe<S>,
  TreeOptions extends Record<string, Func>>(
  state: S,
  tree: TreeOptions,
): ComputeTreeDrop<TreeOptions, S>
export function compute(unknown: any, mayTree?, name?: string): any {
  return createComputed(unknown, mayTree, name, false)
}

/**
 * return computedRef
 * @param recipe
 * @param name
 */
export function computeRef<T>(
  recipe: ComputationRefRecipe<T>,
  name?: string,
): ComputedRef<T>
export function computeRef<S extends UnwrapNestedRefs<any>, T>(
  state: S,
  recipe: ComputationStateRefRecipe<S, T>,
  name?: string,
): ComputedRef<T>
export function computeRef<T>(
  recipe: ComputationRecipeRefOptions<T>,
  name?: string,
): WritableComputedRef<T>
export function computeRef<S, T>(
  state: S,
  recipe: ComputationStateRecipeRefOptions<S, T>,
  name?: string,
): WritableComputedRef<T>
export function computeRef<Func extends ComputationRefRecipe, TreeOptions extends Record<string, Func>>(
  tree: TreeOptions,
): ComputeRefTree<TreeOptions>
export function computeRef<S extends UnwrapNestedRefs<any>,
  Func extends ComputationStateRefRecipe<S>,
  TreeOptions extends Record<string, Func>>(
  state: S,
  tree: TreeOptions,
): ComputeRefTree<TreeOptions>
export function computeRef(unknown: any, mayTree?, name?: string): any {
  return createComputed(unknown, mayTree, name, true)
}

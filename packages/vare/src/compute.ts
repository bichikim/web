import {ComputedRef, WritableComputedRef} from '@vue/reactivity'
import {AnyFunction, DropParameters} from '@winter-love/utils'
import {getGlobalInfo, getIdentifier, getName, getRelates} from 'src/info'
import {AnyStateGroup, relateState} from 'src/state'
import {computed} from 'vue-demi'
import {createUuid} from './utils'

const computationUuid = createUuid('unknown')

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

export type ComputationIdentifierName = 'computation'
export type ComputationRefIdentifierName = 'computation-ref'

export const computationName: ComputationIdentifierName = 'computation'
export const computationRefName: ComputationRefIdentifierName = 'computation-ref'

export type ComputationType = 'getter' | 'getter & setter'

export type Computation<Args extends any[], T> = ((...args: Args) => ComputedRef<T>)
export type ComputationWritable<Args extends any[], T> = ((...args: Args) => WritableComputedRef<T>)

export const isComputation = (value?: any): value is Computation<any[], any> | ComputationWritable<any[], any> => (
  getIdentifier(value) === computationName
)

export const getComputationType = (value: Computation<any, any>): ComputationType | string | undefined => {
  const info = getGlobalInfo()
  const valueInfo = info?.get(value)
  return valueInfo?.type
}

const isRecipeOption = (value?: any): value is ComputationRecipe => (
  typeof value === 'object' && typeof value.get === 'function' && typeof value.set === 'function'
)

// eslint-disable-next-line max-statements
const getComputePrams = (unknown: any, mayRecipe?: any, name?: string) => {
  let state
  let recipe
  let _name

  if (typeof mayRecipe === 'function' || isRecipeOption(mayRecipe)) {
    state = unknown
    recipe = mayRecipe
    _name = name
  } else {
    recipe = unknown
    _name = mayRecipe
  }

  if (!_name) {
    _name = computationUuid()
  }

  return {
    name: _name,
    recipe,
    state,
  }
}

function _compute(unknown: any, mayRecipe?: any, name?: string): any {
  const {state, name: _name, recipe} = getComputePrams(unknown, mayRecipe, name)

  const self = (...args: Readonly<any[]>): any => {
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

  if (process.env.NODE_ENV === 'development') {
    const info = getGlobalInfo()
    info?.set(self, {
      identifier: computationName,
      name: _name,
      type: typeof recipe === 'function' ? 'getter' : 'getter & setter',
    })

    if (state) {
      relateState(state, self)
    }
  }

  return self
}

function _treeCompute(mayState: any, mayTree?) {
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
      result[name] = _compute(state, value, name)
    } else {
      result[name] = _compute(value, name)
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

export function compute<Args extends any[], T>(
  recipe: ComputationRecipe<Args, T>,
  name?: string,
): Computation<Args, T>
export function compute<S extends AnyStateGroup, Args extends any[], T>(
  state: S,
  recipe: ComputationRecipe<[S, ...Args], T>,
  name?: string,
): Computation<Args, T>
export function compute<Args extends any[], T>(
  recipe: ComputationRecipeOptions<Args, T>,
  name?: string,
): ComputationWritable<Args, T>
export function compute<S extends AnyStateGroup, Args extends any[], T>(
  state: S,
  recipe: ComputationRecipeOptionsWithState<S, Args, T>,
  name?: string,
): ComputationWritable<Args, T>
export function compute<Func extends ComputationRecipe, TreeOptions extends Record<string, Func>>(
  tree: TreeOptions,
): ComputeTree<TreeOptions>
export function compute<S extends AnyStateGroup,
  Func extends ComputationStateRecipe<S>,
  TreeOptions extends Record<string, Func>>(
  state: S,
  tree: TreeOptions,
): ComputeTreeDrop<TreeOptions, S>
export function compute(unknown: any, mayTree?, name?: string): any {
  if (
    typeof unknown === 'function'
    || isRecipeOption(unknown)
    || typeof mayTree === 'function'
    || isRecipeOption(mayTree)) {
    return _compute(unknown, mayTree, name)
  }
  return _treeCompute(unknown, mayTree)
}

export function computeRef<T>(
  recipe: ComputationRefRecipe<T>,
  name?: string,
): ComputedRef<T>
export function computeRef<S extends AnyStateGroup, T>(
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
export function computeRef<S extends AnyStateGroup,
  Func extends ComputationStateRefRecipe<S>,
  TreeOptions extends Record<string, Func>>(
  state: S,
  tree: TreeOptions,
): ComputeRefTree<TreeOptions>
export function computeRef(unknown: any, mayTree?, name?: string): any {
  const result = compute(unknown, mayTree, name)

  if (typeof result === 'function') {
    return result()
  }

  return Object.keys(result).reduce((resultRef, key) => {
    const item: () => any = result[key]

    const ref = item()

    if (process.env.NODE_ENV === 'development') {
      const info = getGlobalInfo()
      const name = info ? getName(info, item) : undefined
      const type = getComputationType(item)
      /* istanbul ignore else [item must have the relates] */
      const relates = info ? getRelates(info, item) : undefined
      info?.set(ref, {
        identifier: computationRefName,
        name: name,
        relates,
        type,
      })
    }

    resultRef[key] = ref
    return resultRef
  }, {} as Record<string, any>)
}

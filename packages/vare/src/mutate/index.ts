import {FunctionObject} from '@winter-love/utils'
import {DropFunctionObject, UnwrapNestedRefs} from 'src/types'
import {shallowRef} from 'vue-demi'
import {useInfo} from 'src/info'
import {createGetAtomPrams, createUuid, getRawFunctionString} from 'src/utils'
import {MutateSymbol} from './symbol'

export type MutationRecipe<Args extends any[] = any, Return = any> = (...args: Args) => Return | Promise<Return>
export type MutationStateRecipe<State = any, Args extends any[] = any, Return = any> =
  (state: State, ...args: Args) => Return | Promise<Return>
export type RelatedMutationRecipe<State, Args extends any[], Return> =
  (state: State, ...args: Args) => Return | Promise<Return>

export type MutationIdentifierName = 'mutation'

export const mutationName: MutationIdentifierName = 'mutation'

/**
 * the mutation return type
 */
export type Mutation<Args extends any[], Return = any> = ((...args: Args) => Return) & {
  [MutateSymbol]: boolean
}

export const isMutate = (value?: any): value is Mutation<any[]> => {
  return Boolean(value?.[MutateSymbol])
}

const getMutatePrams = createGetAtomPrams(createUuid('mutate'))

/**
 * create new mutation
 */
function createMutation(unknown, mayRecipe?: any, name?: string): Mutation<any> {
  const {state, recipe, name: _name} = getMutatePrams(unknown, mayRecipe, name)
  const watchTrigger = shallowRef<any[] | null>()

  // create executor
  const mutate: any = (...args: any[]): any => {
    const newArgs = state ? [state, ...args] : args
    if (process.env.NODE_ENV === 'development') {
      watchTrigger.value = args
    }
    return recipe(...newArgs)
  }

  if (process.env.NODE_ENV === 'development') {
    const info = useInfo()
    info.set(mutate, {
      kind: mutationName,
      name: _name,
      raw: getRawFunctionString(recipe),
      watchTrigger,
    })

    // register mutation to state
    if (state) {
      info.set(state, {
        relates: new Map([[_name, mutate]]),
      }, state)
    }
  }

  mutate[MutateSymbol] = true

  return mutate
}

const getTreeMutatePrams = (mayState: any, mayTree: any) => {
  let tree
  let state
  if (mayTree) {
    tree = mayTree
    state = mayState
  } else {
    tree = mayState
  }

  return {
    state,
    tree,
  }
}

/**
 * create new tree mutation
 */
function createTreeMutate(mayState: any, mayTree?: any) {
  const {tree, state} = getTreeMutatePrams(mayState, mayTree)

  return Object.keys(tree).reduce((result, name) => {
    const value = tree[name]
    if (state) {
      result[name] = createMutation(state, value, name)
    } else {
      result[name] = createMutation(value, name)
    }

    return result
  }, {} as Record<any, any>)
}

/**
 * create new mutation or tree mutation
 */
export function mutate<State extends UnwrapNestedRefs<any>, Args extends any[], Return = any>(
  state: State,
  recipe: RelatedMutationRecipe<State, Args, Return>,
  name?: string,
): Mutation<Args>
export function mutate<Args extends any[], Return = any>(
  recipe: MutationRecipe<Args, Return>,
  name?: string,
): Mutation<Args>
export function mutate<Func extends MutationRecipe, TreeOptions extends Record<string, Func>>(
  tree: TreeOptions,
): FunctionObject<TreeOptions>
export function mutate<State extends UnwrapNestedRefs<any>,
  Func extends MutationStateRecipe<State>,
  TreeOptions extends Record<string, Func>,
  >(
  state: State,
  tree: TreeOptions,
): DropFunctionObject<TreeOptions, State>
export function mutate(unknown, mayTree?, name?: string): any {
  if (typeof unknown === 'function' || typeof mayTree === 'function') {
    return createMutation(unknown, mayTree, name)
  }

  return createTreeMutate(unknown, mayTree)
}

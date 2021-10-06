import {FunctionObject} from '@winter-love/utils'
import {DropFunctionObject} from 'src/types'
import {shallowRef} from 'vue-demi'
import {getGlobalInfo, getIdentifier} from './info'
import {AnyStateGroup, relateState} from './state'
import {createGetAtomPrams, createUuid} from './utils'

export type MutationRecipe<Args extends any[] = any, Return = any> = (...args: Args) => Return
export type MutationStateRecipe<S = any, Args extends any[] = any, Return = any> = (s: S, ...args: Args) => Return
export type RelatedMutationRecipe<State, Args extends any[], Return> = (state: State, ...args: Args) => Return

export type MutationIdentifierName = 'mutation'

export const mutationName: MutationIdentifierName = 'mutation'

/**
 * the mutation return type
 */
export type Mutation<Args extends any[], Return = any> = ((...args: Args) => Return)

export const isMutation = (value?: any): value is Mutation<any[]> => getIdentifier(value) === mutationName

const getMutatePrams = createGetAtomPrams(createUuid('unknown'))

/**
 * create new mutation
 */
function createMutation(unknown, mayRecipe?: any, name?: string): Mutation<any> {
  const {state, recipe, name: _name} = getMutatePrams(unknown, mayRecipe, name)
  const watchFlag = shallowRef<any[] | null>()

  // create executor
  const mutate: any = (...args: any[]): any => {
    const newArgs = state ? [state, ...args] : args
    if (process.env.NODE_ENV === 'development') {
      watchFlag.value = args
    }
    return recipe(...newArgs)
  }

  if (process.env.NODE_ENV === 'development') {
    const info = getGlobalInfo()
    info?.set(mutate, {
      identifier: mutationName,
      name: _name,
      trigger: watchFlag,
    })

    // register mutation to state
    if (state) {
      relateState(state, mutate)
    }
  }

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
export function mutate<State extends AnyStateGroup, Args extends any[], Return = any>(
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
export function mutate<State extends AnyStateGroup,
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

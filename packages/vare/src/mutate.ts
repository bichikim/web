import {DropFunctionObject} from 'src/types'
import {FunctionObject} from '@winter-love/utils'
import {ref} from 'vue-demi'
import {devtools} from './devtool'
import {info, getIdentifier} from './info'
import {AnyStateGroup, relateState} from './state'
import {subscribe} from './subscribe'
import {createUuid} from './utils'

const mutationUuid = createUuid('unknown')

export type MutationRecipe<Args extends any[] = any, Return = any> = (...args: Args) => Return
export type MutationStateRecipe<S = any, Args extends any[] = any, Return = any> = (s: S, ...args: Args) => Return
export type RelatedMutationRecipe<State, Args extends any[], Return> = (state: State, ...args: Args) => Return

export type MutationIdentifierName = 'mutation'

export const mutationName: MutationIdentifierName = 'mutation'

/**
 * the mutation return type
 */
export type Mutation<Args extends any[], Return = any> = ((...args: Args) => Return)

export const isMutation = (value?: any): value is Mutation<any[]> => {
  return getIdentifier(value) === mutationName
}

const getMutatePrams = (unknown?, mayRecipe?: any, name?: string) => {
  let recipe
  let state
  let _name
  if (typeof mayRecipe === 'function') {
    state = unknown
    recipe = mayRecipe
    _name = name
  } else {
    recipe = unknown
    _name = mayRecipe
  }

  if (!_name) {
    _name = mutationUuid()
  }
  return {
    name: _name,
    recipe,
    state,
  }
}

/**
 * create new mutation
 */
function _mutate(unknown, mayRecipe?: any, name?: string): Mutation<any> {
  const {state, recipe, name: _name} = getMutatePrams(unknown, mayRecipe, name)
  const flag = ref<any[] | null>(null)

  // create executor
  const self: any = (...args: any[]): any => {
    const newArgs = state ? [state, ...args] : args

    flag.value = args
    return recipe(...newArgs)
  }

  if (process.env.NODE_ENV === 'development') {
    info.set(self, {
      name: _name,
      identifier: mutationName,
      relates: new Set(),
      watchFlag: flag,
    })

    // devtool
    subscribe(self, () => {
      devtools?.updateTimeline('mutation', {
        title: _name,
      })
    })

    // register mutation to state
    if (state) {
      relateState(state, self)
    }
  }

  return self
}

/**
 * create new tree mutation
 */
function _treeMutate(mayState: any, mayTree?: any) {
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
      result[name] = _mutate(state, value, name)
    } else {
      result[name] = _mutate(value, name)
    }

    return result
  }, {} as Record<any, any>)
}

/**
 * create new mutation or tree mutation
 */
export function mutate<S extends AnyStateGroup, Args extends any[], Return = any> (
  state: S,
  recipe: RelatedMutationRecipe<S, Args, Return>,
  name?: string,
): Mutation<Args>
export function mutate<Args extends any[], Return = any> (
  recipe: MutationRecipe<Args, Return>,
  name?: string,
): Mutation<Args>
export function mutate<Func extends MutationRecipe, TreeOptions extends Record<string, Func>> (
  tree: TreeOptions,
): FunctionObject<TreeOptions>
export function mutate<S extends AnyStateGroup, Func extends MutationStateRecipe<S>, TreeOptions extends Record<string, Func>> (
  state: S,
  tree: TreeOptions,
): DropFunctionObject<TreeOptions, S>
export function mutate(unknown, mayTree?, name?: string): any {
  if (typeof unknown === 'function' || typeof mayTree === 'function') {
    return _mutate(unknown, mayTree, name)
  }

  return _treeMutate(unknown, mayTree)
}

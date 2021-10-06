import {
  getGlobalInfo, getIdentifier,
} from 'src/info'
import {
  AnyFunction, FunctionObject,
} from '@winter-love/utils'
import {DropFunctionObject} from 'src/types'
import {
  createGetAtomPrams, createUuid,
} from 'src/utils'
import {shallowRef} from 'vue-demi'
import {
  AnyStateGroup, relateState,
} from 'src/state'

export type ActionRecipe<Args extends any[] = any[], Return = any> = (...args: Args) => Return | Promise<Return>
export type ActionStateRecipe<State = any, Args extends any[] = any[], Return = any> =
  (state: State, ...args: Args) => Return
export type RelatedActionRecipe<State, Args extends any[], Return> =
  (state: State, ...args: Args) => Return | Promise<Return>

export type ActionIdentifierName = 'action'

export const actionName: ActionIdentifierName = 'action'

export type Action<Args extends any[], Return = any> =
  ((...args: Args) => Return | Promise<Return>)

/**
 * check if it is an action
 * only work in development NODE_ENV
 * @param value
 */
export const isAction = (value?: any): value is Action<any> => (getIdentifier(value) === actionName)

const getActPrams = createGetAtomPrams(createUuid('unknown'))

const _act = <Args extends any[], Return> (
  unknown: any,
  mayRecipe: any,
  name?: string,
): Action<Args> => {
  const {
    state, recipe, name: _name,
  } = getActPrams(unknown, mayRecipe, name)
  const watchFlag = shallowRef<any[]>()

  const self: any = (...args: Args): Return | Promise<Return> => {
    const newArgs = state ? [state, ...args] : args

    if (process.env.NODE_ENV === 'development') {
      watchFlag.value = args
    }

    return recipe(...newArgs)
  }

  if (process.env.NODE_ENV === 'development') {
    const info = getGlobalInfo()
    info?.set(self, {
      identifier: actionName,
      name: _name,
      relates: new Set(),
      trigger: watchFlag,
    })

    if (state) {
      relateState(state, self)
    }
  }

  return self
}

const getTreeActPrams = (mayState: any, mayTree: any) => {
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

const _treeAct = <K extends string, F extends AnyFunction> (
  mayState: any,
  mayTree: Record<K, F>,
): Record<K, (...args: Parameters<F>) => ReturnType<F>> => {
  const {
    tree, state,
  } = getTreeActPrams(mayState, mayTree)
  return Object.keys(tree).reduce((result, name) => {
    const value = tree[name]
    if (state) {
      result[name] = _act(state, value, name)
    } else {
      result[name] = _act(value, name)
    }
    return result
  }, {} as Record<any, any>)
}

export function act<State extends AnyStateGroup, Args extends any[], Return = any>(
  state: State,
  recipe: RelatedActionRecipe<State, Args, Return>,
  name?: string,
): Action<Args>
export function act<Args extends any[], Return> (
  recipe: ActionRecipe<Args, Return>,
  name?: string,
): Action<Args>
export function act<Func extends ActionRecipe, TreeOptions extends Record<string, Func>>(
  tree: TreeOptions
): FunctionObject<TreeOptions>
export function act<
  State extends AnyStateGroup,
  Func extends ActionStateRecipe<State>,
  TreeOptions extends Record<string, Func>
  >(
  state: State,
  tree: TreeOptions,
): DropFunctionObject<TreeOptions, State>
export function act(
  unknown: any,
  mayTree?: any,
  name?: any,
): any {
  if (typeof unknown === 'function' || typeof mayTree === 'function') {
    return _act(unknown, mayTree, name)
  }
  return _treeAct(unknown, mayTree)
}

// todo create actRef

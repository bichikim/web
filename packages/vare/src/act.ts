import {info, getIdentifier} from 'src/info'
import {AnyFunction, FunctionObject} from '@winter-love/utils'
import {createUuid} from 'src/utils'
import {ref} from 'vue-demi'
import {devtools} from './devtool'
import {subscribe} from './subscribe'

const actionUuid = createUuid('unknown')

export type ActionRecipe<Args extends any[] = any[], Return = any> = (...args: Args) => Return | Promise<Return>

export type ActionIdentifierName = 'action'

export const actionName: ActionIdentifierName = 'action'

export type Action<Args extends any[], Return = any> =
  ((...args: Args) => Return | Promise<Return>)

/**
 * check if it is an action
 * only work in development NODE_ENV
 * @param value
 */
export const isAction = (value?: any): value is Action<any> => {
  return getIdentifier(value) === actionName
}

const _act = <Args extends any[], Return> (
  recipe: ActionRecipe<Args, Return>,
  name?: string,
): Action<Args> => {
  const flag = ref<any[] | null>(null)
  const _name = name ?? actionUuid()

  const self: any = (...args: Args): Return | Promise<Return> => {
    flag.value = args
    return recipe(...args)
  }

  if (process.env.NODE_ENV === 'development') {
    info.set(self, {
      name: _name,
      identifier: actionName,
      relates: new Set(),
      watchFlag: flag,
    })

    subscribe(self, () => {
      devtools?.updateTimeline('action', {
        title: _name,
      })
    })
  }

  return self
}

const _treeAct = <K extends string, F extends AnyFunction> (
  tree: Record<K, F>,
): Record<K, (...args: Parameters<F>) => ReturnType<F>> => {
  return Object.keys(tree).reduce((result, name) => {
    result[name] = _act(tree[name], name)
    return result
  }, {} as Record<any, any>)
}

export function act<Func extends ActionRecipe, TreeOptions extends Record<string, Func>> (tree: TreeOptions): FunctionObject<TreeOptions>
export function act<Args extends any[], Return> (
  recipe: ActionRecipe<Args, Return>,
  name?: string,
): Action<Args>
export function act(
  mayTree,
  name?: any,
): any {
  if (typeof mayTree === 'function') {
    return _act(mayTree, name)
  }
  return _treeAct(mayTree)
}

// todo create actRef

import {UnwrapNestedRefs} from '@winter-love/use'
import {DropParameters} from '@winter-love/utils'
import {isRef, reactive, Ref, shallowRef, unref} from 'vue-demi'
import {getGlobalInfo} from '../info'
import {
  ActionSymbol,
  Atom,
  AtomIdentifierName,
  AtomRecipe,
  AtomSymbol,
  AtomType,
  AtomTypeWithRecipe,
  AtomTypeWithRecipeTree,
  MayAtomType,
} from './types'

export * from './types'

export const atomName: AtomIdentifierName = 'atom'

export const isAtom = (value: any): value is Atom<any> => {
  return Boolean(value?.[AtomSymbol])
}

export const getAtomActionWatchTarget = (target: any) => {
  const trigger = target[ActionSymbol]
  if (!trigger) {
    return {}
  }

  return trigger
}

export const wrapAtom = <T extends Record<string, any>>(value: MayAtomType<T>): Ref<T> => {
  return reactive(isAtom(value) ? value : (isRef(value) ? unref(value) : value)) as any
}

export function atom<State>(initState: MayAtomType<State>): AtomType<State>
export function atom<State extends Record<string, any>,
  Recipe extends AtomRecipe<UnwrapNestedRefs<State>>,
  TreeOptions extends Record<string, Recipe>>(
  initState: MayAtomType<State>,
  recipeTree: TreeOptions,
): AtomTypeWithRecipeTree<State, Recipe, TreeOptions>
export function atom<State,
  Recipe extends AtomRecipe<UnwrapNestedRefs<State>>,
  >(
  initState: MayAtomType<State>,
  recipe?: Recipe,
): AtomTypeWithRecipe<State, DropParameters<Recipe>>

export function atom<T extends Record<string, any>, Args extends any[]>(
  initState: MayAtomType<T>,
  recipe?: any,
  name?: string,
): any {
  const valueReactive = wrapAtom(initState)
  const trigger = shallowRef<any[]>()
  let atom

  if (typeof recipe === 'function') {
    atom = new Proxy(valueReactive, {
      get: (target, point) => {
        switch (point) {
          case '$':
            return (...args: Args) => {
              trigger.value = args
              return recipe(valueReactive, ...args)
            }
          default:
            return Reflect.get(target, point, target)
        }
      },
      set: (target, point, value) => {
        return Reflect.set(target, point, value, target)
      },
    })
  } else if (typeof recipe === 'object' && !Array.isArray(recipe)) {
    const clonedRecipe = {...recipe}

    const action = new Proxy({}, {
      get: (target, point) => {
        const recipe = clonedRecipe[point]
        return (...args: Args) => {
          trigger.value = args
          recipe?.(valueReactive, ...args)
        }
      },
    })

    atom = new Proxy(valueReactive, {
      get: (target, point) => {
        switch (point) {
          case '$':
            return action
          default:
            return Reflect.get(target, point, target)
        }
      },
      set: (target, point, value) => {
        return Reflect.set(target, point, value, target)
      },
    })
  } else {
    atom = new Proxy(valueReactive, {
      get: (target, point) => {
        return Reflect.get(target, point, target)
      },
      set: (target, point, value) => {
        return Reflect.set(target, point, value, target)
      },
    })
  }
  if (process.env.NODE_ENV === 'development') {
    const info = getGlobalInfo()

    info?.set(atom, {
      identifier: atomName,
      name,
      state: valueReactive,
      trigger,
    })
  }

  atom[AtomSymbol] = true
  atom[ActionSymbol] = trigger

  return atom
}


import {UnwrapNestedRefs} from '@winter-love/use'
import {computed, shallowRef} from 'vue-demi'
import {getGlobalInfo} from '../info'
import {
  ActionSymbol,
  AtomGetterRecipe,
  AtomIdentifierName,
  AtomRecipe,
  AtomSymbol,
  AtomType,
  AtomTypeWithRecipe,
  AtomTypeWithRecipeTree,
  GetterSymbol,
  MayAtomType,
} from './types'
import {createAction, wrapAtom} from './utils'

export * from './types'
export * from './utils'

export const atomName: AtomIdentifierName = 'atom'

export const createTreeAtom = (reactive, trigger, recipe) => {
  const clonedRecipe = Object.keys(recipe).reduce((result, key) => {
    const value = recipe[key]
    if (value[GetterSymbol]) {
      result[key] = computed(() => value(reactive))
    } else {
      result[key] = value
    }

    return result
  }, {})

  const relates = new Map<string, any>(Object.entries(clonedRecipe))

  const action = new Proxy({}, {
    get: (target, point) => {
      const recipe = clonedRecipe[point]
      if (typeof recipe === 'function') {
        return createAction(trigger, reactive, recipe)
      }
      return recipe
    },
  })

  return {
    atom: new Proxy(reactive, {
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
    }),
    relates,
  }
}

export const createFunctionAtom = (reactive, trigger, recipe) => {
  const clonedRecipe = recipe[GetterSymbol] ? computed(() => recipe(reactive)) : recipe
  const relates = new Map([['default', clonedRecipe]])
  return {
    atom: new Proxy(reactive, {
      get: (target, point) => {
        switch (point) {
          case '$':
            return typeof clonedRecipe === 'function'
              ? createAction(trigger, reactive, recipe)
              : clonedRecipe
          default:
            return Reflect.get(target, point, target)
        }
      },
      set: (target, point, value) => {
        return Reflect.set(target, point, value, target)
      },
    }),
    relates,
  }
}

export const createAtom = (reactive) => {
  return new Proxy(reactive, {
    get: (target, point) => {
      return Reflect.get(target, point, target)
    },
    set: (target, point, value) => {
      return Reflect.set(target, point, value, target)
    },
  })
}

export function atom<State>(initState: MayAtomType<State>): AtomType<State>
export function atom<State extends Record<string, any>,
  Recipe extends AtomRecipe<UnwrapNestedRefs<State>> | AtomGetterRecipe<UnwrapNestedRefs<State>, unknown>,
  TreeOptions extends Record<string, Recipe>>(
  initState: MayAtomType<State>,
  recipeTree: TreeOptions,
): AtomTypeWithRecipeTree<State, Recipe, TreeOptions>
export function atom<State,
  Recipe extends AtomRecipe<UnwrapNestedRefs<State>> | AtomGetterRecipe<UnwrapNestedRefs<State>, unknown>,
  >(
  initState: MayAtomType<State>,
  recipe?: Recipe,
): AtomTypeWithRecipe<State, Recipe>
export function atom<T extends Record<string, any>>(
  initState: MayAtomType<T>,
  recipe?: any,
  name?: string,
): any {
  const valueReactive = wrapAtom(initState)
  const trigger = shallowRef<any[]>()
  let relates
  let atom

  // recipe = function
  if (typeof recipe === 'function') {
    const result = createFunctionAtom(valueReactive, trigger, recipe)
    // eslint-disable-next-line prefer-destructuring
    atom = result.atom
    // eslint-disable-next-line prefer-destructuring
    relates = result.relates
    // recipe tree
  } else if (typeof recipe === 'object' && !Array.isArray(recipe)) {
    const result = createTreeAtom(valueReactive, trigger, recipe)
    // eslint-disable-next-line prefer-destructuring
    atom = result.atom
    // eslint-disable-next-line prefer-destructuring
    relates = result.relates
    // recipe none
  } else {
    atom = createAtom(valueReactive)
  }

  // save information for devtool
  if (process.env.NODE_ENV === 'development') {
    const info = getGlobalInfo()

    info?.set(atom, {
      identifier: atomName,
      name,
      relates,
      state: valueReactive,
      trigger,
    })
  }

  // symbol mark
  atom[AtomSymbol] = true
  atom[ActionSymbol] = trigger

  return atom
}


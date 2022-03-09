import {useInfo} from 'src/info'
import {getRawFunctionString} from 'src/utils'
import {computed, shallowRef} from 'vue-demi'
import {
  ActionSymbol,
  ActionWatchSymbol,
  AtomComputedRefSymbol,
  AtomGetterRecipe,
  AtomIdentifierName,
  AtomRecipe,
  AtomSymbol,
  AtomType,
  AtomTypeWithRecipe,
  AtomTypeWithRecipeTree,
  GetterSymbol,
  MayAtomType,
  Recipe,
} from './types'
import {createAction, wrapAtom} from './utils'

export * from './types'
export * from './utils'

export const atomName: AtomIdentifierName = 'atom'
export const atomActionName = 'atom-action'

export const isAtomComputedRef = (value: any) => Boolean(value?.[AtomComputedRefSymbol])

export const isAction = (value: any) => Boolean(value?.[ActionSymbol])

const createComputedAction = (reactive, recipe, name?: string) => {
  const isGetter = recipe[GetterSymbol]
  const clonedRecipe = isGetter ? computed(() => recipe(reactive)) : recipe

  if (isGetter) {
    clonedRecipe[AtomComputedRefSymbol] = true
  } else {
    clonedRecipe[ActionSymbol] = true
  }

  if (process.env.NODE_ENV === 'development') {
    const info = useInfo()
    info.set(clonedRecipe, {
      kind: atomActionName,
      name,
      raw: getRawFunctionString(recipe),
    })
  }

  return clonedRecipe
}

export const createTreeAtom = (reactive, trigger, recipe: Record<string, any>, relates?: Map<string, any>) => {

  const clonedRecipe = Object.fromEntries(Object.keys(recipe).map((key) => {
    const value = recipe[key]
    return [key, createComputedAction(reactive, value, key)]
  }))

  const _relates: Map<string, any> = relates ?? new Map<string, any>()

  Object.entries(clonedRecipe).map(([key, value]) => _relates.set(key, value))

  const action = new Proxy({}, {
    get: (target, point) => {
      if (typeof point !== 'string') {
        return
      }
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
    relates: _relates,
  }
}

// eslint-disable-next-line max-params
export const createFunctionAtom = (reactive, trigger, recipe, relates?: Map<string, any>, name?: string) => {
  const clonedRecipe = createComputedAction(reactive, recipe, name)

  const _relates = relates ?? new Map<string, any>()

  _relates.set('default', clonedRecipe)

  const atom = new Proxy(reactive, {
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
  })

  return {
    atom,
    relates: _relates,
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

/**
 * @deprecated
 * @param initState
 */
export function atom<State>(initState: MayAtomType<State>): AtomType<State>
export function atom<State extends Record<string, any>,
  TreeOptions extends Record<string, Recipe<State>>>(
  initState: MayAtomType<State>,
  recipeTree: TreeOptions,
): AtomTypeWithRecipeTree<State, TreeOptions>
export function atom<State,
  Recipe extends AtomRecipe<State> | AtomGetterRecipe<State>,
  >(
  initState: MayAtomType<State>,
  recipe?: Recipe,
): AtomTypeWithRecipe<State, Recipe>
export function atom<State extends Record<string, any>>(
  initState: MayAtomType<State>,
  recipe?: any,
  name?: string,
): any {
  const valueReactive = wrapAtom(initState)
  const watchTrigger = shallowRef<any[]>()
  let relates
  let atom

  // recipe = function
  if (typeof recipe === 'function') {
    const result = createFunctionAtom(valueReactive, watchTrigger, recipe, undefined, name)
    // eslint-disable-next-line prefer-destructuring
    atom = result.atom
    // eslint-disable-next-line prefer-destructuring
    relates = result.relates
    // recipe tree
  } else if (typeof recipe === 'object' && !Array.isArray(recipe)) {
    const result = createTreeAtom(valueReactive, watchTrigger, recipe)
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
    const info = useInfo()
    info.set(atom, {
      kind: atomName,
      name,
      relates,
      watchTrigger,
    }, valueReactive)
  }

  // symbol mark
  atom[AtomSymbol] = true
  atom[ActionWatchSymbol] = watchTrigger

  return atom
}


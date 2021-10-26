import {UnwrapNestedRefs} from '@winter-love/use'
import {computed, shallowRef} from 'vue-demi'
import {useInfo} from 'src/info'
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

export const createTreeAtom = (reactive, trigger, recipe: Record<string, any>, relates?: Map<string, any>) => {
  // const clonedRecipe = Object.keys(recipe).reduce((result, key) => {
  //   const value = recipe[key]
  //   if (value[GetterSymbol]) {
  //     result[key] = computed(() => value(reactive))
  //   } else {
  //     result[key] = value
  //   }
  //
  //   return result
  // }, {})

  const clonedRecipe = Object.fromEntries(Object.keys(recipe).map((key) => {
    const value = recipe[key]
    if (value[GetterSymbol]) {
      return [key, computed(() => value(reactive))]
    }
    return [key, value]
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

export const createFunctionAtom = (reactive, trigger, recipe, relates?: Map<string, any>) => {
  const clonedRecipe = recipe[GetterSymbol] ? computed(() => recipe(reactive)) : recipe

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
    const result = createFunctionAtom(valueReactive, watchTrigger, recipe)
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
      kind: 'atom',
      name,
      relates,
      watchTrigger,
    }, valueReactive)
  }

  // symbol mark
  atom[AtomSymbol] = true
  atom[ActionSymbol] = watchTrigger

  return atom
}


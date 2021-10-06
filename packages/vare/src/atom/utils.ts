import {UnwrapNestedRefs} from '@winter-love/use'
import {isRef, reactive, Ref, unref} from 'vue-demi'
import {
  ActionSymbol,
  Atom,
  AtomRecipe,
  AtomSymbol,
  GetterRecipe,
  GetterRecipeInside,
  GetterSymbol,
  MayAtomType,
} from './types'

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

export const wrapAtom = <T extends Record<string, any>>(value: MayAtomType<T>): UnwrapNestedRefs<T> => {
  return reactive(isAtom(value) ? value : (isRef(value) ? unref(value) : value)) as any
}

export const getter = <Return>(recipe: GetterRecipe<Return>): GetterRecipeInside<Return> => {
  return Object.assign((state) => recipe(state), {
    [GetterSymbol]: true,
  }) as any
}

export const createAction = <Args extends any[]>(
  trigger: Ref<any>,
  reactive: UnwrapNestedRefs<any>,
  recipe?: AtomRecipe<any>,
) => {
  return (...args: Args) => {
    trigger.value = args
    return recipe?.(reactive, ...args)
  }
}

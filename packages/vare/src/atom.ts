import {freeze} from '@winter-love/utils'
import {Ref, ref} from 'vue'

export type AtomRecipe<T, Args extends any[]> = (state: Ref<T>, ...args: Args) => unknown

export const atom = <T, Args extends any[]> (initState: T | Ref<T>, recipe: AtomRecipe<T, Args>) => {
  const valueRef = ref(initState)

  return freeze({
    setValue(...args: Args) {
      recipe(valueRef as Ref<T>, ...args)
    },
    get value() {
      return valueRef.value
    },
  })
}

import {Draft, produce} from 'immer'
import {shallowRef, ShallowRef} from 'vue'

export type Recipe<S> = (arg: Draft<S>) => void
/**
 * immer ref
 * @param value
 */
export const useImmer = <T>(value: T): [ShallowRef<T>, (recipe) => void] => {
  const state = shallowRef(value)
  const update = (recipe: Recipe<T>) => {
    state.value = produce(state.value, recipe)
  }
  return [state, update]
}

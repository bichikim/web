import {shallowRef, ShallowRef} from 'vue'
import {MaybeRef} from 'src/types'
import produce, {Draft} from 'immer'
import {resolveRef} from 'src/resolve-ref'
export type Recipe<S> = (arg: Draft<S>) => void
/**
 * immer ref
 * @param value
 */
export const useImmer = <T>(value: MaybeRef<T>): [ShallowRef<T>, (recipe) => void] => {
  const state = shallowRef(resolveRef(value))
  const update = (recipe: Recipe<T>) => {
    state.value = produce(state.value, recipe)
  }
  return [state, update]
}

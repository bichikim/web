import {createMutable} from 'solid-js/store'
import {createMemo} from 'solid-js'

export interface UseWrapProps<T> {
  value: T
}

export const createWrap = <T>(props: UseWrapProps<T>) => {
  const state = createMutable(props)

  const setValue = (value: (prev: T) => T) => {
    state.value = value(state.value)
  }

  return [() => state.value, setValue]
}

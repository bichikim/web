import {createEffect, createSignal, Signal, untrack} from 'solid-js'

export const useMutableMemo = <T>(fn: () => T): Signal<T> => {
  const [value, setValue] = createSignal<T>(untrack(() => fn()))

  createEffect(() => {
    const value = fn()

    setValue(() => value)
  })

  return [value, setValue]
}

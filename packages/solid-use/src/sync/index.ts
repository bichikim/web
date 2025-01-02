import {createEffect, createSignal, Signal} from 'solid-js'
import {MayBeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'

export const sync = <T>(value: MayBeAccessor<T>): Signal<T> => {
  const valueAccessor = resolveAccessor(value)
  const [getValue, setValue] = createSignal<T>(valueAccessor())

  createEffect(() => {
    const value = valueAccessor()

    setValue(() => value)
  })

  return [getValue, setValue]
}

export const createSync = sync

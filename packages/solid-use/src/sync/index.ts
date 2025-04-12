import {createEffect, createSignal, Signal, untrack} from 'solid-js'
import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'

export const sync = <T>(value: MaybeAccessor<T>): Signal<T> => {
  const valueAccessor = resolveAccessor(value)
  const untrackedValue = untrack(() => valueAccessor())
  const [getValue, setValue] = createSignal<T>(untrackedValue)

  createEffect(() => {
    const value = valueAccessor()

    setValue(() => value)
  })

  return [getValue, setValue]
}

export const createSync = sync

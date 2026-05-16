import {createComputed, createSignal, type Signal, untrack} from 'solid-js'
import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'

/**
 * @param value
 * @returns
 */
export const createSync = <T>(value: MaybeAccessor<T>): Signal<T> => {
  const valueAccessor = resolveAccessor(value)
  const untrackedValue = untrack(() => valueAccessor())
  const [getValue, setValue] = createSignal<T>(untrackedValue)

  createComputed(() => {
    setValue(valueAccessor)
  })

  return [getValue, setValue]
}


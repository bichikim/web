import {Accessor, createComputed, createSignal} from 'solid-js'
import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'

/**
 * Solid hook that returns an accessor to the previous value of a reactive source.
 *
 * The accessor is `undefined` until the source changes at least once. A non-reactive
 * source never updates, so it always stays `undefined`.
 *
 * **Undefined values:** When `T` includes `undefined`, you cannot tell "not changed yet"
 * apart from "the previous value was `undefined`".
 */
export const createPreviousValue = <T>(value: MaybeAccessor<T>): Accessor<T | undefined> => {
  const valueAccessor = resolveAccessor(value)
  const [prevValue, setPrevValue] = createSignal<T | undefined>(undefined)

  createComputed((prev: T | undefined) => {
    const value = valueAccessor()

    setPrevValue(() => prev)

    return value
  })
  return prevValue
}

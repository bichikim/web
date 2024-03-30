import {createEffect, onCleanup} from 'solid-js'
import {resolveAccessors} from 'src/use/resolve-accessor'
import {AccessorsValue, MayBeAccessors} from 'src/use/types'

type CleanUpFunc<T> = (prevValue: T) => void

const noneClone = <T>(value: T): T => value

/**
 * When it detects that a value has changed, it calls callback with a value and a prevValue
 * You can do a cleanup by returning the function with the callback return value.
 * @param value
 * @param callback
 * @param clone
 */
export const watch = <T extends MayBeAccessors>(
  value: T,
  callback: (
    value: AccessorsValue<T>,
    prevValue: AccessorsValue<T> | undefined,
  ) => CleanUpFunc<T> | void,
  clone: (value: AccessorsValue<T>) => AccessorsValue<T> = noneClone,
) => {
  const valueAccessor = resolveAccessors(value)
  const isArrayValue = Array.isArray(value)
  let _prevValue: any = isArrayValue ? [] : undefined

  createEffect(() => {
    const value = clone(valueAccessor())
    const cleanUp = callback(value, _prevValue)
    _prevValue = value

    return onCleanup(() => {
      if (typeof cleanUp === 'function') {
        cleanUp(value)
      }
    })
  })
}

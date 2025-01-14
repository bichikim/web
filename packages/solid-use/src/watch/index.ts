import {createEffect, onCleanup} from 'solid-js'
import {resolveAccessors} from 'src/resolve-accessor'
import {AccessorsValue, MayBeAccessors} from 'src/types'

type CleanUpFunc<T> = (prevValue: T) => void

const noneClone = <T>(value: T): T => value

export interface UseWatchOptions<T> {
  clone?: (value: AccessorsValue<T>) => AccessorsValue<T>
}

/**
 * When it detects that a value has changed, it calls callback with a value and a prevValue
 * You can do a cleanup by returning the function with the callback return value.
 * @param value
 * @param callback
 * @param options
 */
export const useWatch = <T extends MayBeAccessors>(
  value: T,
  callback: (
    value: AccessorsValue<T>,
    prevValue: AccessorsValue<T> | undefined,
  ) => CleanUpFunc<T> | void,
  options: UseWatchOptions<T> = {},
) => {
  const {clone = noneClone} = options
  const valueAccessor = resolveAccessors(value)
  const isArrayValue = Array.isArray(value)
  let _prevValue: any = isArrayValue ? [] : undefined

  createEffect(() => {
    const valueFromAccessor = valueAccessor()
    const value = isArrayValue
      ? valueFromAccessor.map((value: any) => clone(value))
      : clone(valueFromAccessor)
    const cleanUp = callback(value, _prevValue)

    _prevValue = value
    onCleanup(() => {
      if (typeof cleanUp === 'function') {
        cleanUp(value)
      }
    })
  })
}

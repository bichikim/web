import {MaybeArray} from 'src/types'
import {isNil} from 'es-toolkit/compat'

/**
 * return an array always
 * @param value
 */
export const toArray = <T>(value?: MaybeArray<T> | null): T[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (isNil(value)) {
    return []
  }

  return [value]
}

import {MayArray} from 'src/types'

/**
 * @useful ⭐⭐⭐⭐⭐
 * @param value
 */
export const toArray = <T>(value?: MayArray<T> | null): T[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'undefined') {
    return []
  }

  if (value === null) {
    return []
  }

  return [value]
}

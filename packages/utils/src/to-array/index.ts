import {MayArray} from 'src/types'

export const toArray = <T>(value?: MayArray<T>): T[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'undefined') {
    return []
  }

  if (value == null) {
    return []
  }

  return [value]
}

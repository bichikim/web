import {castArray} from 'lodash'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const safeCastArray = (value: any) => {
  if (typeof value === 'undefined' || value === null) {
    return []
  }
  return castArray(value)
}

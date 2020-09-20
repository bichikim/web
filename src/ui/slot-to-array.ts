import {castArray} from 'lodash'

export const slotToArray = (slot) => {
  if (slot) {
    return castArray(slot())
  }

  return []
}

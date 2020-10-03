import {castArray} from 'lodash'

export const slotToArray = (slot?: () => any): any[] => {
  if (slot) {
    return castArray(slot())
  }

  return []
}

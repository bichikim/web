import castArray from 'lodash/castArray'

export const slotToArray = (slot?: () => any): any[] => {
  if (slot) {
    return castArray(slot())
  }

  return []
}

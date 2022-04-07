/**
 * @example compact([1, '', null, undefined]) // [1]
 * @param list
 */
export const compact = <T>(list: T[]): T[] => {
  return list.filter((item: any) => {
    if (item === null) {
      return false
    }
    if (typeof item === 'undefined') {
      return false
    }
    return Boolean(item)
  })
}

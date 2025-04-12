export const drop = <T>(list: T[], size: number = 1): T[] => {
  const _list = [...list]

  _list.splice(0, size)

  return _list
}

/**
 * @example drop(1)([1, 2, 3]) // [2, 3]
 * @param size
 * todo fix this
 */
export const dropFn =
  (size: number = 1) =>
  <T>(list: T[]): T[] => {
    return drop<T>(list, size)
  }

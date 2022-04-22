
/**
 * @example drop(1)([1, 2, 3]) // [2, 3]
 * @param size
 */export const drop = (size: number = 1) => <T>(list: T[]): T[] => {
  const _list = [...list]
  _list.splice(0, size)
  return _list
}

export const dropN = <T>(list: T[], size: number = 1): T[] => {
  const _list = [...list]
  _list.splice(0, size)
  return _list
}


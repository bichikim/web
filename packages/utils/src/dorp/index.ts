export const drop = (size: number = 1) => <T>(list: T[]): T[] => {
  const _list = [...list]
  _list.splice(0, size)
  return _list
}

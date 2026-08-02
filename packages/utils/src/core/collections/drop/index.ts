export const drop = <T>(list: T[], size: number = 1): T[] => {
  const _list = [...list]

  _list.splice(0, size)

  return _list
}

export const chunk = (size: number) => <T>(list: readonly T[]): T[][] => {
  const _list = [...list]
  // eslint-disable-next-line functional/prefer-readonly-type
  const result: T[][] = []

  // eslint-disable-next-line functional/no-loop-statement
  while (_list.length >= size) {
    result.push(_list.splice(0, size))
  }
  if (_list.length > 0) {
    result.push(_list)
  }
  return result
}

export const chunk = (size: number) => <T>(list: T[]): T[][] => {
  const _list = [...list]
  const result: any[] = []
  while (_list.length >= size) {
    result.push(_list.splice(0, size))
  }
  if (_list.length > 0) {
    result.push(_list)
  }
  return result
}

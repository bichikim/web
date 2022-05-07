
export const take = <T>(list: T[], size: number = 1) => {
  return list.slice(0, size)
}

export const takeFn = (size: number = 1) => <T>(list: T[]): T[] => {
  return take<T>(list, size)
}

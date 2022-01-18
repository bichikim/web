export const map = <T, R>(iteratee: (value: T, key: number, array: T[]) => R) => (list: T[]): R[] => {
  return list.map((value: T, key, array) => iteratee(value, key, array))
}

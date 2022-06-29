export const map = <T, R>(list: T[], iteratee: (value: T, key: number, array: T[]) => R): R[] => {
  return list.map((value: T, key, array) => iteratee(value, key, array))
}

export const mapFn =
  <T, R>(iteratee: (value: T, key: number, array: T[]) => R) =>
  (list: T[]): R[] => {
    return map<T, R>(list, iteratee)
  }

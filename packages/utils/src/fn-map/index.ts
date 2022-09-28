import {map} from 'src/map'

export const fnMap =
  <T, R>(iteratee: (value: T, key: number, array: T[]) => R) =>
  (list: T[]): R[] => {
    return map<T, R>(list, iteratee)
  }

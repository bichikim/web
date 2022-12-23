const {map: originalMap} = Array.prototype

const _map = <T, R>(list: T[], iteratee: (value: T, key: number, array: T[]) => R): R[] => {
  return originalMap.call(list, (value: T, key, array) => iteratee(value, key, array))
}

export interface Map {
  <T, R>(list: T[]): (iteratee: (value: T, key: number, array: T[]) => R) => R[]
  <T, R>(list: T[], iteratee: (value: T, key: number, array: T[]) => R): R[]
}

export const map: Map = (...args: any[]): any => {
  const [list, iteratee] = args

  if (args.length > 1) {
    return _map(list, iteratee)
  }

  return (iteratee) => {
    return _map(list, iteratee)
  }
}

export interface MapOp {
  <T, R>(iteratee: (value: T, key: number, array: T[]) => R): (list: T[]) => R[]
  <T, R>(iteratee: (value: T, key: number, array: T[]) => R, list: T[]): R[]
}

export const mapOp: MapOp = (...args: any[]): any => {
  const [iteratee, list] = args

  if (args.length > 1) {
    return _map(list, iteratee)
  }

  return (list: any[]) => {
    return _map(list, iteratee)
  }
}

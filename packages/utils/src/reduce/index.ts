const {reduce: originalReduce} = Array.prototype

export type ReduceIteratee<T, R> = (previousValue: R, currentValue: T, currentIndex: number, array: T[]) => R

const _reduce = <T, R>(list: T[], iteratee: ReduceIteratee<T, R>, initialValue?: R): R => {
  // ignore type from reduce
  return (originalReduce as any).call(list, iteratee, initialValue)
}

export interface Reduce {
  <T>(list: T[]): <R>(iteratee: ReduceIteratee<T, R>, initialValue?: R) => R

  <T, R>(list: T[], iteratee: ReduceIteratee<T, R>, initialValue?: R): R
}

// retype with Reduce
export const reduce: Reduce = (...args: any[]): any => {
  const [list, iteratee, initialValue] = args

  if (args.length > 1) {
    return _reduce(list, iteratee, initialValue)
  }

  return (iteratee, initialValue) => {
    return _reduce(list, iteratee, initialValue)
  }
}

export interface ReduceOp {
  <T, R>(iteratee: ReduceIteratee<T, R>, initialValue?: R): (list: T[]) => R

  <T, R>(iteratee: ReduceIteratee<T, R>, initialValue: R, list: T[]): R
}

// retype with ReduceOp
export const reduceOp: ReduceOp = (...args: any[]): any => {
  const [iteratee, initialValue, list] = args

  if (args.length > 2) {
    return _reduce(list, iteratee, initialValue)
  }

  return (list) => {
    return _reduce(list, iteratee, initialValue)
  }
}

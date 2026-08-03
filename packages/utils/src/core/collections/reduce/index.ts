const {reduce: originalReduce} = Array.prototype
const DIRECT_ARGUMENT_COUNT = 3

export type ReduceIteratee<T, R> = (
  previousValue: R,
  currentValue: T,
  currentIndex: number,
  array: T[],
) => R

const reduceWithInitialValue = <T, R>(
  list: T[],
  iteratee: ReduceIteratee<T, R>,
  initialValue: R,
): R => {
  return Reflect.apply(originalReduce, list, [iteratee, initialValue]) as R
}

const reduceWithoutInitialValue = <T>(list: T[], iteratee: ReduceIteratee<T, T>): T => {
  return Reflect.apply(originalReduce, list, [iteratee]) as T
}

export interface Reduce {
  <T>(list: T[]): {
    (iteratee: ReduceIteratee<T, T>): T
    <R>(iteratee: ReduceIteratee<T, R>, initialValue: R): R
  }

  <T>(list: T[], iteratee: ReduceIteratee<T, T>): T
  <T, R>(list: T[], iteratee: ReduceIteratee<T, R>, initialValue: R): R
}

const reduceImplementation = (...args: unknown[]): unknown => {
  const [list, iteratee, initialValue] = args

  if (args.length >= DIRECT_ARGUMENT_COUNT) {
    return reduceWithInitialValue(
      list as unknown[],
      iteratee as ReduceIteratee<unknown, unknown>,
      initialValue,
    )
  }

  if (args.length === 2) {
    return reduceWithoutInitialValue(
      list as unknown[],
      iteratee as ReduceIteratee<unknown, unknown>,
    )
  }

  return (...curriedArgs: unknown[]) => {
    const [curriedIteratee, curriedInitialValue] = curriedArgs

    if (curriedArgs.length >= 2) {
      return reduceWithInitialValue(
        list as unknown[],
        curriedIteratee as ReduceIteratee<unknown, unknown>,
        curriedInitialValue,
      )
    }

    return reduceWithoutInitialValue(
      list as unknown[],
      curriedIteratee as ReduceIteratee<unknown, unknown>,
    )
  }
}

export const reduce = reduceImplementation as Reduce

import {reduce} from 'src/reduce'
import {toValue} from 'src/to-value'
import {MaybeFunction} from 'src/types'

/**
 * it can accept array result flow
 */
export function pipe<A, R1, R2, R3, R4, R5, R6, R7>(
  f1: (value: A) => R1,
  f2: (value: R1) => R2,
  f3: (value: R2) => R3,
  f4: (value: R3) => R4,
  f5: (value: R4) => R5,
  f6: (value: R5) => R6,
  f7: (value: R6) => R7,
): (value: MaybeFunction<A>) => R7
export function pipe<A, R1, R2, R3, R4, R5, R6, R7>(
  f1: (value: A) => R1,
  f2: (value: R1) => R2,
  f3: (value: R2) => R3,
  f4: (value: R3) => R4,
  f5: (value: R4) => R5,
  f6: (value: R5) => R6,
  f7: (value: R6) => R7,
  ...func: ((a: unknown) => unknown)[]
): (value: MaybeFunction<A>) => unknown
export function pipe<A, R1, R2, R3, R4, R5, R6>(
  f1: (value: A) => R1,
  f2: (value: R1) => R2,
  f3: (value: R2) => R3,
  f4: (value: R3) => R4,
  f5: (value: R4) => R5,
  f6: (value: R5) => R6,
): (value: MaybeFunction<A>) => R6

export function pipe<A, R1, R2, R3, R4, R5>(
  f1: (value: A) => R1,
  f2: (value: R1) => R2,
  f3: (value: R2) => R3,
  f4: (value: R3) => R4,
  f5: (value: R4) => R5,
): (value: MaybeFunction<A>) => R5

export function pipe<A, R1, R2, R3, R4>(
  f1: (value: A) => R1,
  f2: (value: R1) => R2,
  f3: (value: R2) => R3,
  f4: (value: R3) => R4,
): (value: MaybeFunction<A>) => R4

export function pipe<A, R1, R2, R3>(
  f1: (value: A) => R1,
  f2: (value: R1) => R2,
  f3: (value: R2) => R3,
): (value: MaybeFunction<A>) => R3

export function pipe<A, R1, R2>(f1: (value: A) => R1, f2: (value: R1) => R2): (value: MaybeFunction<A>) => R2

export function pipe<A, R1>(f1: (value: A) => R1): (value: MaybeFunction<A>) => R1

export function pipe(...functions: ((...args: unknown[]) => unknown)[]): unknown {
  return (_value) => {
    return reduce(
      functions,
      (prev, value) => {
        return value(prev)
      },
      toValue(_value),
    )
  }
}

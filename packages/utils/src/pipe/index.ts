import {ArrayOrOne, MaybePromise} from 'src/types'
import {toArray} from '../to-array'

/**
 * it can accept array result flow
 */
export function pipe<A extends any[], R1, R2, R3, R4, R5, R6, R7>(
  f1: (...args: A) => R1,
  f2: (...args: ArrayOrOne<R1>) => R2,
  f3: (...args: ArrayOrOne<R2>) => R3,
  f4: (...args: ArrayOrOne<R3>) => R4,
  f5: (...args: ArrayOrOne<R4>) => R5,
  f6: (...args: ArrayOrOne<R5>) => R6,
  f7: (...args: ArrayOrOne<R6>) => R7,
): (...args: A) => R7
export function pipe<A extends any[], R1, R2, R3, R4, R5, R6, R7>(
  f1: (...args: A) => R1,
  f2: (...args: ArrayOrOne<R1>) => R2,
  f3: (...args: ArrayOrOne<R2>) => R3,
  f4: (...args: ArrayOrOne<R3>) => R4,
  f5: (...args: ArrayOrOne<R4>) => R5,
  f6: (...args: ArrayOrOne<R5>) => R6,
  f7: (...args: ArrayOrOne<R6>) => R7,
  ...func: ((a: any) => any)[]
): (...args: A) => any
export function pipe<A extends any[], R1, R2, R3, R4, R5, R6>(
  f1: (...args: A) => R1,
  f2: (...args: ArrayOrOne<R1>) => R2,
  f3: (...args: ArrayOrOne<R2>) => R3,
  f4: (...args: ArrayOrOne<R3>) => R4,
  f5: (...args: ArrayOrOne<R4>) => R5,
  f6: (...args: ArrayOrOne<R5>) => R6,
): (...args: A) => R6
export function pipe<A extends any[], R1, R2, R3, R4, R5>(
  f1: (...args: A) => R1,
  f2: (...args: ArrayOrOne<R1>) => R2,
  f3: (...args: ArrayOrOne<R2>) => R3,
  f4: (...args: ArrayOrOne<R3>) => R4,
  f5: (...args: ArrayOrOne<R4>) => R5,
): (...args: A) => R5
export function pipe<A extends any[], R1, R2, R3, R4>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => R2,
  f3: (...args: ArrayOrOne<R2>) => R3,
  f4: (...args: ArrayOrOne<R3>) => R4,
): (...args: A) => Promise<R4>
export function pipe<A extends any[], R1, R2, R3>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => R2,
  f3: (...args: ArrayOrOne<R2>) => R3,
): (...args: A) => Promise<R3>
export function pipe<A extends any[], R1, R2>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => R2,
): (...args: A) => Promise<R2>
export function pipe<A extends any[], R1>(
  f1: (...args: A) => MaybePromise<R1>,
): (...args: A) => Promise<R1>
export function pipe(...functions: ((...args: any[]) => any)[]): (...args: any[]) => any {
  return (...args: any[]) => {
    let result: any[] = args
    functions.forEach((item) => {
      result = item(...toArray(result))
    })
    return result
  }
}

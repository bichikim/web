import {ArrayOrOne, MaybePromise} from '../types'
import {toArray} from '../to-array'

export function asyncPipe<A extends any[], R1, R2, R3, R4, R5, R6, R7>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => MaybePromise<R2>,
  f3: (...args: ArrayOrOne<R2>) => MaybePromise<R3>,
  f4: (...args: ArrayOrOne<R3>) => MaybePromise<R4>,
  f5: (...args: ArrayOrOne<R4>) => MaybePromise<R5>,
  f6: (...args: ArrayOrOne<R5>) => MaybePromise<R6>,
  f7: (...args: ArrayOrOne<R6>) => MaybePromise<R7>,
): (...args: A) => R7
export function asyncPipe<A extends any[], R1, R2, R3, R4, R5, R6, R7>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => MaybePromise<R2>,
  f3: (...args: ArrayOrOne<R2>) => MaybePromise<R3>,
  f4: (...args: ArrayOrOne<R3>) => MaybePromise<R4>,
  f5: (...args: ArrayOrOne<R4>) => MaybePromise<R5>,
  f6: (...args: ArrayOrOne<R5>) => MaybePromise<R6>,
  f7: (...args: ArrayOrOne<R6>) => MaybePromise<R7>,
  ...func: ((a: any) => any)[]
): (...args: A) => any
export function asyncPipe<A extends any[], R1, R2, R3, R4, R5, R6>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => MaybePromise<R2>,
  f3: (...args: ArrayOrOne<R2>) => MaybePromise<R3>,
  f4: (...args: ArrayOrOne<R3>) => MaybePromise<R4>,
  f5: (...args: ArrayOrOne<R4>) => MaybePromise<R5>,
  f6: (...args: ArrayOrOne<R5>) => MaybePromise<R6>,
): (...args: A) => R6
export function asyncPipe<A extends any[], R1, R2, R3, R4, R5>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => MaybePromise<R2>,
  f3: (...args: ArrayOrOne<R2>) => MaybePromise<R3>,
  f4: (...args: ArrayOrOne<R3>) => MaybePromise<R4>,
  f5: (...args: ArrayOrOne<R4>) => MaybePromise<R5>,
): (...args: A) => Promise<R5>
export function asyncPipe<A extends any[], R1, R2, R3, R4>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => MaybePromise<R2>,
  f3: (...args: ArrayOrOne<R2>) => MaybePromise<R3>,
  f4: (...args: ArrayOrOne<R3>) => MaybePromise<R4>,
): (...args: A) => Promise<R4>
export function asyncPipe<A extends any[], R1, R2, R3>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => MaybePromise<R2>,
  f3: (...args: ArrayOrOne<R2>) => MaybePromise<R3>,
): (...args: A) => Promise<R3>
export function asyncPipe<A extends any[], R1, R2>(
  f1: (...args: A) => MaybePromise<R1>,
  f2: (...args: ArrayOrOne<R1>) => MaybePromise<R2>,
): (...args: A) => Promise<R2>
export function asyncPipe<A extends any[], R1>(
  f1: (...args: A) => MaybePromise<R1>,
): (...args: A) => Promise<R1>
export function asyncPipe(...functions: ((...args: any[]) => any)[]): (...args: any[]) => any {
  return async (...args: any[]) => {
    return functions.reduce((result, item) => {
      return result.then((args) => {
        return item(...toArray(args))
      })
    }, Promise.resolve(args))
  }
}

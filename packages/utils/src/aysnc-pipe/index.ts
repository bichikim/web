import {reduce} from 'src/reduce'
import {toValue} from 'src/to-value'
import {MaybeFunction, MaybePromise} from 'src/types'

export function asyncPipe<A, R1, R2, R3, R4, R5, R6, R7>(
  f1: (args: A) => MaybePromise<R1>,
  f2: (args: R1) => MaybePromise<R2>,
  f3: (args: R2) => MaybePromise<R3>,
  f4: (args: R3) => MaybePromise<R4>,
  f5: (args: R4) => MaybePromise<R5>,
  f6: (args: R5) => MaybePromise<R6>,
  f7: (args: R6) => MaybePromise<R7>,
  ...func: ((a: unknown) => unknown)[]
): (arg: MaybeFunction<A>) => unknown
export function asyncPipe<A, R1, R2, R3, R4, R5, R6, R7>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
  f6: (arg: R5) => MaybePromise<R6>,
  f7: (arg: R6) => MaybePromise<R7>,
): (arg: MaybeFunction<A>) => R7
export function asyncPipe<A, R1, R2, R3, R4, R5, R6>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
  f6: (arg: R5) => MaybePromise<R6>,
): (arg: MaybeFunction<A>) => Promise<R6>
export function asyncPipe<A, R1, R2, R3, R4, R5>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
): (arg: MaybeFunction<A>) => Promise<R5>
export function asyncPipe<A, R1, R2, R3, R4>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
): (arg: MaybeFunction<A>) => Promise<R4>
export function asyncPipe<A, R1, R2, R3>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
): (arg: MaybeFunction<A>) => Promise<R3>
export function asyncPipe<A, R1, R2>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
): (arg: MaybeFunction<A>) => Promise<R2>
export function asyncPipe<A, R1>(f1: (arg: A) => MaybePromise<R1>): (arg: A) => Promise<R1>

export function asyncPipe(...functions: ((...args: unknown[]) => unknown)[]): unknown {
  return async (value: unknown) => {
    return reduce(
      functions,
      (result, item) => {
        return result.then((args) => {
          return item(args)
        })
      },
      Promise.resolve(toValue(value)),
    )
  }
}

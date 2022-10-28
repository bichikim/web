import {MaybePromise} from 'src/types'

export function asyncPipe<A, R1, R2, R3, R4, R5, R6, R7>(
  f1: (args: A) => MaybePromise<R1>,
  f2: (args: R1) => MaybePromise<R2>,
  f3: (args: R2) => MaybePromise<R3>,
  f4: (args: R3) => MaybePromise<R4>,
  f5: (args: R4) => MaybePromise<R5>,
  f6: (args: R5) => MaybePromise<R6>,
  f7: (args: R6) => MaybePromise<R7>,
  ...func: ((a: any) => any)[]
): (arg: A) => any
export function asyncPipe<A, R1, R2, R3, R4, R5, R6, R7>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
  f6: (arg: R5) => MaybePromise<R6>,
  f7: (arg: R6) => MaybePromise<R7>,
): (arg: A) => R7
export function asyncPipe<A, R1, R2, R3, R4, R5, R6>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
  f6: (arg: R5) => MaybePromise<R6>,
): (arg: A) => Promise<R6>
export function asyncPipe<A, R1, R2, R3, R4, R5>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
): (arg: A) => Promise<R5>
export function asyncPipe<A, R1, R2, R3, R4>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
): (arg: A) => Promise<R4>
export function asyncPipe<A, R1, R2, R3>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
): (arg: A) => Promise<R3>
export function asyncPipe<A, R1, R2>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
): (arg: A) => Promise<R2>
export function asyncPipe<A, R1>(f1: (arg: A) => MaybePromise<R1>): (arg: A) => Promise<R1>
export function asyncPipe(...functions: ((...args: any[]) => any)[]): (...args: any[]) => any {
  return async (...args: any[]) => {
    return functions.reduce((result, item) => {
      return result.then((args) => {
        return item(args)
      })
    }, Promise.resolve(args))
  }
}
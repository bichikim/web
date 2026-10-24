// oxlint-disable max-params
// oxlint-disable id-length
import {reduce} from 'src/core/collections/reduce'
import type {MaybePromise} from 'src/core/types/shared'

export interface AsyncPipeline<Input, Output> {
  (value: Input): Promise<Output>

  /** Runs the pipeline with a value produced when this method is called. */
  lazy(getValue: () => Input): Promise<Output>
}

interface AsyncPipeFunction {
  (value: never): MaybePromise<unknown>
}

type LastAsyncPipeResult<Functions extends readonly AsyncPipeFunction[]> =
  Functions extends readonly [...AsyncPipeFunction[], infer LastFunction extends AsyncPipeFunction]
    ? Awaited<ReturnType<LastFunction>>
    : never

export function asyncPipe<A, R1, R2, R3, R4, R5, R6, R7>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
  f6: (arg: R5) => MaybePromise<R6>,
  f7: (arg: R6) => MaybePromise<R7>,
): AsyncPipeline<A, R7>
export function asyncPipe<A, R1, R2, R3, R4, R5, R6>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
  f6: (arg: R5) => MaybePromise<R6>,
): AsyncPipeline<A, R6>
export function asyncPipe<A, R1, R2, R3, R4, R5>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
): AsyncPipeline<A, R5>
export function asyncPipe<A, R1, R2, R3, R4>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
): AsyncPipeline<A, R4>
export function asyncPipe<A, R1, R2, R3>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
): AsyncPipeline<A, R3>
export function asyncPipe<A, R1, R2>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
): AsyncPipeline<A, R2>
export function asyncPipe<A, R1>(f1: (arg: A) => MaybePromise<R1>): AsyncPipeline<A, R1>
export function asyncPipe<
  A,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  RemainingFunctions extends readonly [AsyncPipeFunction, ...AsyncPipeFunction[]],
>(
  f1: (arg: A) => MaybePromise<R1>,
  f2: (arg: R1) => MaybePromise<R2>,
  f3: (arg: R2) => MaybePromise<R3>,
  f4: (arg: R3) => MaybePromise<R4>,
  f5: (arg: R4) => MaybePromise<R5>,
  f6: (arg: R5) => MaybePromise<R6>,
  f7: (arg: R6) => MaybePromise<R7>,
  ...remainingFunctions: RemainingFunctions
): AsyncPipeline<A, LastAsyncPipeResult<RemainingFunctions>>

export function asyncPipe(...functions: ((...args: unknown[]) => unknown)[]): unknown {
  const run = async (value: unknown) => {
    return reduce(
      functions,
      (result, item) => {
        return result.then((args) => {
          return item(args)
        })
      },
      Promise.resolve(value),
    )
  }

  return Object.assign(run, {
    lazy: async (getValue: () => unknown) => run(getValue()),
  })
}

import {AnyFunction} from 'src/core/types/shared'

export interface PrevArgsFunc<Args extends unknown[], Result = unknown> {
  (...args: Args): Result
  readonly prevArgs: Args | undefined
}

export const trackPreviousArgs = <Args extends unknown[], Result>(
  caller: AnyFunction<Args, Result>,
): PrevArgsFunc<Args, Result> => {
  let prevArgs: Args | undefined

  const run = (...args: Args) => {
    const result = caller(...args)

    prevArgs = [...args] as Args

    return result
  }

  Object.defineProperty(run, 'prevArgs', {
    configurable: false,
    enumerable: true,
    get: () => prevArgs,
  })

  return run as PrevArgsFunc<Args, Result>
}

/** @deprecated Use `trackPreviousArgs` instead. */
export const createPrevArgs = trackPreviousArgs

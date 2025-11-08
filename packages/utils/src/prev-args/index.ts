import {freeze} from 'src/freeze'
import {AnyFunction} from 'src/types'

export interface PrevArgsFunc<Args extends any[]> {
  (...args: Args): unknown
  readonly prevArgs: Args
}

export const createPrevArgs = <Args extends unknown[]>(caller: AnyFunction<Args>): PrevArgsFunc<Args> => {
  // should solve type somehow
  let prevArgs: Args = [] as any

  const run = (...args: Args) => {
    const result = caller(...args)

    // should solve type somehow
    prevArgs = [...args] as any

    return result
  }

  return Object.assign(
    freeze({
      get prevArgs(): Args {
        return prevArgs
      },
    }),
    run,
  )
}

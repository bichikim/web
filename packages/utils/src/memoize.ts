import memoize, {MicroMemoize} from 'micro-memoize'
import {AnyFunction} from './types'
import isEqual from 'react-fast-compare'

export {memoize}

export type MemoizeOptions = MicroMemoize.Options

export const deepMemoize = <F extends AnyFunction>(
  function_: F | MicroMemoize.Memoized<F>,
  options: MicroMemoize.Options = {},
): MicroMemoize.Memoized<F> => memoize(function_, {isEqual, ...options})

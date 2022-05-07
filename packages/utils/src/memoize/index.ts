import microMemoize, {MicroMemoize} from 'micro-memoize'
import {AnyFunction} from 'src/types'
import isEqual from 'react-fast-compare'
export type {MicroMemoize} from 'micro-memoize'

export type MemoizeOptions = MicroMemoize.Options

export type Memoized<F extends AnyFunction> = MicroMemoize.Memoized<F>

export const memoize = microMemoize

export const deepMemoize = <F extends AnyFunction>(
  function_: F | MicroMemoize.Memoized<F>,
  options?: MemoizeOptions,
) => microMemoize(function_, {isEqual, ...options})

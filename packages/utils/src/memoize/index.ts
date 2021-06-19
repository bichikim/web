import microMemoize, {MicroMemoize} from 'micro-memoize'
import {AnyFunction} from 'src/types'
import isEqual from 'react-fast-compare'

export type MemoizeOptions = MicroMemoize.Options

export type Memoized<F extends AnyFunction> = MicroMemoize.Memoized<F>

export const memoize = (options?: MemoizeOptions) =>
  <F extends AnyFunction>(function_: F | MicroMemoize.Memoized<F>) => (microMemoize(function_, options))

export const deepMemoize = (options?: MemoizeOptions) =>
  <F extends AnyFunction>(function_: F | MicroMemoize.Memoized<F>) => (microMemoize(function_, {isEqual, ...options}))

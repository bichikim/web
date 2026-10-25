import {MAX_PARAMETER_DIMENSIONS} from '../player/document'
import type {ParameterTuple} from './types'

export const isParameterTuple = <T>(values: ReadonlyArray<T>): values is ParameterTuple<T> =>
  values.length > 0 && values.length <= MAX_PARAMETER_DIMENSIONS

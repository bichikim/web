import {MAX_PARAMETER_DIMENSIONS} from '../player/document'
import type {ParameterTuple} from './types'
export type {ParameterTuple} from './types'

export const mapParameterTuple = <T, R>(
  values: ParameterTuple<T>,
  transform: (value: T, index: number) => R,
): ParameterTuple<R> => {
  switch (values.length) {
    case 1:
      return [transform(values[0], 0)]
    case 2:
      return [transform(values[0], 0), transform(values[1], 1)]
    case MAX_PARAMETER_DIMENSIONS:
      return [transform(values[0], 0), transform(values[1], 1), transform(values[2], 2)]
  }
}

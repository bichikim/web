import {isUndefined} from 'src/is-undefined'
import {toValue} from 'src/to-value'
import {MaybeFunction} from 'src/types'

export const defaultValue = <T>(value: T | undefined, defaultValue: MaybeFunction<T>) => {
  if (isUndefined(value)) {
    return toValue(defaultValue)
  }

  return value
}

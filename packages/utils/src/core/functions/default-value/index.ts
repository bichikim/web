import {isUndefined} from 'es-toolkit/predicate'
import {toValue} from 'src/core/functions/to-value'
import {MaybeFunction} from 'src/core/types/shared'

export const defaultValue = <T>(value: T | undefined, defaultValue: MaybeFunction<T>) => {
  if (isUndefined(value)) {
    return toValue(defaultValue)
  }

  return value
}

import {toValue} from 'src/to-value'
import {MaybeFunction} from 'src/types'

export function defaultValue<T>(value: T, defaultValue?: MaybeFunction<T>): T {
  if (typeof value === 'undefined') {
    return toValue(defaultValue)
  }
  return value
}

export function defaultValueFn<T>(_defaultValue: MaybeFunction<T>): (value: T) => T {
  return (value: T): T => {
    return defaultValue(value, _defaultValue)
  }
}

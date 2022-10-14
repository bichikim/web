import {toValue} from 'src/to-value'
import {MaybeFunction} from 'src/types'
/**
 * return defaultValue working for undefined not null
 * @param value
 * @param defaultValue
 */
export const defaultValue = <T>(value: T, defaultValue?: MaybeFunction<T>) => {
  if (typeof value === 'undefined') {
    return toValue(defaultValue)
  }
  return value
}

export const defaultValueFn = <T>(_defaultValue: MaybeFunction<T>) => {
  return (value: T) => {
    return defaultValue(value, _defaultValue)
  }
}

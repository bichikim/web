import {toValue} from 'src/to-value'
import {MaybeFunction} from 'src/types'

export const undefinedWhen = (value: any) => typeof value === 'undefined'

export function defaultValue<T>(
  value: T,
  defaultValue?: MaybeFunction<T>,
  when: (value: T) => boolean = undefinedWhen,
): T {
  if (when(value)) {
    return toValue(defaultValue)
  }
  return value
}

export function defaultValueFn<T>(
  _defaultValue: MaybeFunction<T>,
  when: (value: T) => boolean = undefinedWhen,
): (value: T) => T {
  return (value: T): T => {
    return defaultValue(value, _defaultValue, when)
  }
}

import {toValue} from 'src/factory/to-value'
import {MaybeFunction} from 'src/types'
import {isUndefined} from 'src/validate/is-undefined'

export const defaultValue = <T>(
  value: T,
  defaultValue: MaybeFunction<T>,
  when: (value: T) => boolean = isUndefined,
): T => {
  if (when(value)) {
    return toValue(defaultValue)
  }
  return value
}

type DefaultValueOp1<T> = (value?: T) => T

interface DefaultValueOp {
  <T>(defaultValue?: MaybeFunction<T>, when?: (value: T) => boolean): DefaultValueOp1<T>

  <T>(defaultValue: MaybeFunction<T>, when?: (value: T) => boolean, value?: T): T
}

// retype by DefaultValueOp
export const defaultValueOp: DefaultValueOp = (...args: any[]) => {
  const [_defaultValue, when, value] = args
  if (args.length > 2) {
    return defaultValue(value, _defaultValue, when)
  }
  return (value) => {
    return defaultValue(value, _defaultValue, when)
  }
}

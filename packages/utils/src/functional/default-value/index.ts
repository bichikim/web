import {toValue} from 'src/to-value'

/**
 * return defaultValue working for undefined not null
 * @param value
 * @param defaultValue
 */
export function defaultValue<T>(value: T, defaultValue?: () => T): T
export function defaultValue<T>(value: T, defaultValue?: T): T
export function defaultValue(value: any, defaultValue?: any): any {
  if (typeof value === 'undefined') {
    return toValue(defaultValue)
  }
  return value
}

export function defaultValueFn<T>(_defaultValue: T): (value: T) => T
export function defaultValueFn<T>(_defaultValue: () => T): (value: T) => T
export function defaultValueFn<T>(_defaultValue: any): (value: T) => T {
  return (value: T): T => {
    return defaultValue(value, _defaultValue)
  }
}

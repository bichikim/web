import {AnyObject} from 'src/types'

/**
 * clean undefined value
 * but don’t make a case to use this one
 * @param value
 */
export const cleanObject = (value: AnyObject) => {
  return Object.keys(value).reduce((result, key) => {
    const _value = value[key]
    if (typeof _value === 'undefined' || _value === null) {
      return result
    }
    result[key] = _value
    return result
  }, {} as AnyObject)
}

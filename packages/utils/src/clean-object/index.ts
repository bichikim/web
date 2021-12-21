import {AnyObject} from 'src/types'

/**
 * remove keys which has undefined value
 * but don’t make a case to use this
 * @param value
 */
export const cleanObject = (value: AnyObject) => (
  Object.keys(value).reduce((result, key) => {
    const _value = value[key]
    if (typeof _value === 'undefined' || _value === null) {
      return result
    }
    result[key] = _value
    return result
  }, {} as AnyObject)
)

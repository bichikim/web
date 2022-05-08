import {AnyObject} from 'src/types'
import {isArray} from 'src/vanilla'
import {isObject} from '../is-object'

export const isRecord = (value?: any): value is AnyObject => {
  if (!isObject(value)) {
    return false
  }
  return !isArray(value)
}

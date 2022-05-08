import {AnyObject} from '../types'

export const isObject = (value: any): value is AnyObject => {
  return value !== null && typeof value === 'object'
}

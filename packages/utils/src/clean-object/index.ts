import {AnyObject} from 'src/types'

/**
 * remove keys which has undefined value
 * but don’t make a case to use this
 * @param value
 */
export const cleanObject = (value: AnyObject) => {
  const step = Object.entries(value).filter(([_, value]) => Boolean(value))
  return Object.fromEntries(step)
}

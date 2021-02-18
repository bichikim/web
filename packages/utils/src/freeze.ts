import {AnyObject} from './types'

/**
 * Optimized freeze
 * @param record
 */
export const freeze = <T extends AnyObject>(record: T): Readonly<T> => {
  if (process.env.NODE_ENV === 'development') {
    return Object.freeze(record)
  }

  return record
}

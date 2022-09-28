import {PureObject} from 'src/types'
const {entries, fromEntries} = Object
import {flow} from '../flow'

/**
 * remove keys which has undefined value
 * but don’t make a case to use this
 * @param value
 */
export const cleanObject = flow(
  (value: PureObject) => entries(value),
  (value) => value.filter(([_, value]) => Boolean(value)),
  fromEntries,
)

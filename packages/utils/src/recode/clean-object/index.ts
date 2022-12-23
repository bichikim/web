import {PureObject} from 'src/types'
const {entries, fromEntries} = Object
import {pipe} from 'src/functional/pipe'

/**
 * remove keys which has undefined value
 * but don’t make a case to use this
 * @param value
 */
export const cleanObject = pipe(
  (value: PureObject) => entries(value),
  (value) => value.filter(([_, value]) => Boolean(value)),
  fromEntries,
)

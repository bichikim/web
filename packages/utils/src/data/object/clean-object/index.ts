import {pipe} from 'src/core/functions/pipe'
import {PureObject} from 'src/core/types/shared'

const {entries, fromEntries} = Object

/**
 * remove keys which has undefined value
 * but don’t make a case to use this
 * @param value
 */
export const cleanObject = pipe(
  (value: PureObject) => entries(value),
  (value) => value.filter(([, value]) => value !== undefined),
  fromEntries,
)

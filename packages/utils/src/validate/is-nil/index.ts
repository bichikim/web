import {isNull} from 'src/validate/is-null'
import {isUndefined} from 'src/validate/is-undefined'

export const isNil = (value: any): value is null | undefined =>
  isUndefined(value) || isNull(value)

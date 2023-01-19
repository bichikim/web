import {isNull} from 'src/validate/is-null'
import {isUndefined} from 'src/validate/is-undefined'

export const isNil = (value: any) => isUndefined(value) || isNull(value)

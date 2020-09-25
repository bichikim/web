import {pickBy} from 'lodash'

export const cleanObject = (o) => pickBy(o, (v) => v !== undefined)

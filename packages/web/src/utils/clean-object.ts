import {pickBy} from 'lodash'

export const cleanObject = (o: Record<string, any>): ReturnType<typeof pickBy> => pickBy(o, (v) => v !== undefined)

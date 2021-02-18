import {pickBy} from 'lodash'

/**
 * clean undefined value
 * but don’t make a case to use this one
 * @param o
 */
export const cleanObject = (o: Record<string, any>): ReturnType<typeof pickBy> => pickBy(o, (v) => v !== undefined)

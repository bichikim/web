import pickBy from 'lodash/fp/pickBy'
import pipe from 'lodash/fp/pipe'
import isUndefined from 'lodash/isUndefined'
import {not} from 'src/functional-programming'

/**
 * clean undefined value
 * but don’t make a case to use this one
 * @param o
 */
export const cleanObject = pickBy(pipe(isUndefined, not))

import {freeze} from './freeze'

export const emptyArray: Readonly<unknown[]> = freeze([])

export const emptyObject: Readonly<Record<any, unknown>> = freeze({})

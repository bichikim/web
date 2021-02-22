import {freeze} from 'src/freeze'

export const emptyArray: Readonly<unknown[]> = freeze([])

export const emptyObject: Readonly<Record<any, unknown>> = freeze({})

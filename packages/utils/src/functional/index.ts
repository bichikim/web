export * from './map'
import {chunk as _chunk} from 'lodash'
export const reverse = <T>(list: T[]) => list.reverse()
export const join = (separator: string) => (list: any[]) => list.join(separator)
export const chunk = (size: number) => <T>(list: T[]) => _chunk(list, size)

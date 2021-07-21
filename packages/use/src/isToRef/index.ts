import {ToRef} from 'src/types'

export const isToRef = <T>(value: any): value is ToRef<T> => {
  return Boolean(value._key)
}

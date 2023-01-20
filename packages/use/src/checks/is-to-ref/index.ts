import {ToRef} from 'src/types'
import {isReadonly} from 'src/_imports/vue'

export const isToRef = <T>(value: any): value is ToRef<T> => {
  return Boolean(value?._key)
}

export const isWritableToRef = <T>(value: any): value is ToRef<T> => {
  return !isReadonly(value?._object) && isToRef(value)
}

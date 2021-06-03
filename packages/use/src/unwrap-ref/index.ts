import {UnwrapRef, isRef} from 'vue-demi'
import {MayRef} from 'src/types'

export const unwrapRef = <T extends MayRef<any>>(value: T): UnwrapRef<T> => {
  if (isRef(value)) {
    return value.value as any
  }
  return value as any
}

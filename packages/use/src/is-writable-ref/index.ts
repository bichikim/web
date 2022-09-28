import {MaybeRef} from 'src/types'
import {isReadonly, isRef, WritableComputedRef} from 'vue'
import {isToRef} from 'src/isToRef'

export const isWritableRef = <T = any>(value: MaybeRef<T>): value is WritableComputedRef<T> => {
  return isRef(value) && !isToRef(value) && !isReadonly(value)
}

import {MaybeRef} from 'src/types'
import {isReadonly, isRef, Ref} from 'vue'
import {isToRef} from 'src/is-to-ref'

export const isWritableRef = <T = any>(value: MaybeRef<T>): value is Ref<T> => {
  return isRef(value) && !isToRef(value) && !isReadonly(value)
}

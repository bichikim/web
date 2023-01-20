import {MaybeRef} from 'src/types'
import {ComputedRef, isReadonly, isRef, Ref, WritableComputedRef} from 'vue'
import {isToRef} from 'src/checks/is-to-ref'

export type MakeWritableRef<T> = T extends ComputedRef ? never : Ref | WritableComputedRef<any>

export const isWritableRef = <T = any>(value: MaybeRef<T>): value is MakeWritableRef<T> => {
  return isRef(value) && !isToRef(value) && !isReadonly(value)
}

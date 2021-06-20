import {
  ComputedRef, Ref, UnwrapRef, WritableComputedRef,
} from 'vue-demi'

export type ToRef<T> = [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
export type MayRef<T> = Ref<T> | ComputedRef<T> | T | WritableComputedRef<T>

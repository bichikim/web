import {Ref, UnwrapRef} from 'vue'

export type ToRef<T> = [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
export type MayRef<T> = Ref<T> | T

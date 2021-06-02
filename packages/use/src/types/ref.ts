import {Ref, UnwrapRef, ComputedRef, WritableComputedRef, Component} from 'vue-demi'

export type ToRef<T> = [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
export type MayRef<T> = Ref<T> | ComputedRef<T> | T | WritableComputedRef<T>
export type PossibleElement = Element | Component | null | undefined

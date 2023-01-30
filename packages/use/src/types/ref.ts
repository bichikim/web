import {EmptyObject} from '@winter-love/utils'
import {
  ComponentOptionsBase,
  ComputedRef,
  Ref,
  ToRef,
  UnwrapRef,
  WatchSource,
  WritableComputedRef,
} from 'vue'

export type ToRefsValueOnly<T = any> = {
  [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : ToRef<T[K]>
}

export type MaybeRef<T> = Ref<T> | ComputedRef<T> | T | WritableComputedRef<T>

export type WritableRef<T> = WritableComputedRef<T> | Ref<T>

export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRef<T>

/**
 * Vue 컴포넌트에서 Props Type 을 추출 합니다
 */
export type ExtractComponentProps<T> = T extends ComponentOptionsBase<
  // Props
  infer P,
  // RawBindings
  any,
  // Data
  any,
  // Computed
  any,
  // Methods
  any,
  // Mixin
  any,
  // Extends
  any,
  any
>
  ? unknown extends P
    ? EmptyObject
    : P
  : EmptyObject

/**
 * 여러 WatchSource
 */
export type MultiWatchSources = (WatchSource<unknown> | object)[]

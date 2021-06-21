import {
  computed, isRef, Ref, ref, UnwrapRef,
} from 'vue'
import {MayRef} from 'src/types'
import {NotUndefined} from '@winter-love/utils'

export type UnwrapRefWithInit<T extends MayRef<any>, P extends UnwrapRef<T>> =
  P extends undefined ? Ref<UnwrapRef<T>> : Ref<NotUndefined<UnwrapRef<T>>>

export interface WrapRefOptions<P> {
  /**
   * @default true
   */
  bindValue?: boolean
  initState?: P | undefined
}

export const wrapRef = <
  T extends MayRef<any>,
  P extends UnwrapRef<T> = UnwrapRef<T>
  >(
    value?: T,
    options: WrapRefOptions<P> = {},
  ): UnwrapRefWithInit<T, P> => {
  const {bindValue = true, initState} = options

  if (isRef(value)) {
    if (bindValue) {
      return computed({
        get: () => {
          return value.value ?? initState
        },
        set: (_value) => {
          value.value = _value
        },
      }) as any
    }
    return ref(value.value ?? initState) as any
  }
  return ref(value ?? initState) as any
}

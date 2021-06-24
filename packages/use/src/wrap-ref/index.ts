import {
  computed, isRef, Ref, ref, UnwrapRef, isReadonly, watch,
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
    // to be bind & ref is not a readonly
    if (bindValue && !isReadonly(value)) {
      return computed({
        get: () => {
          return value.value ?? initState
        },
        set: (_value) => {
          value.value = _value
        },
      }) as any
    }
    const innerRef = ref(value.value ?? initState)
    watch(value, (value) => {
      innerRef.value = value
    })
    return innerRef as any
  }
  return ref(value ?? initState) as any
}

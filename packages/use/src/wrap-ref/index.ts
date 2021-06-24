import {
  computed, isReadonly, isRef, ref, Ref, UnwrapRef, watch,
} from 'vue'
import {MayRef} from 'src/types'
import {NotUndefined} from '@winter-love/utils'

export type UnwrapRefWithInit<T extends MayRef<any>, P extends UnwrapRef<T>> =
  P extends undefined ? Ref<UnwrapRef<T>> : Ref<NotUndefined<UnwrapRef<T>>>

export interface WrapRefOptions<P> {
  /**
   * Use with caution. The returned Ref will update the value Ref argument
   * 주의 하여 사용 하세요. return Ref 는 value Ref argument 를 업데이트 할 것입니다
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

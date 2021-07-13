import {NotUndefined} from '@winter-love/utils'
import {MayRef} from 'src/types'
import {isReadonly, isRef, ref, Ref, watch} from 'vue-demi'

export type RefWithInit<T, P extends T> =
  P extends undefined ? Ref<T> : Ref<NotUndefined<T>>

export interface WrapRefOptions<P> {
  /**
   * Use with caution. The returned Ref will update the value Ref argument
   * 주의 하여 사용 하세요. return Ref 는 value Ref argument 를 업데이트 할 것입니다
   * @default true
   */
  bindValue?: boolean
  initState?: P | undefined
}

export const wrapRef = <T,
  P extends T = T>(
    value?: MayRef<T>,
    options: WrapRefOptions<P> = {},
  ): RefWithInit<T, P> => {
  const {bindValue = true, initState} = options

  if (isRef(value)) {
    const innerRef = ref<any>(value.value ?? initState)

    if (bindValue) {
      watch(innerRef, (_value) => {
        if (isReadonly(value)) {
          return
        }
        (value as any).value = _value
      })
    }

    watch(value, (_value) => {
      innerRef.value = _value
    })

    return innerRef as any
  }

  return ref(value ?? initState) as any
}

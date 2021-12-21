import {NotUndefined} from '@winter-love/utils'
import {isToRef} from 'src/isToRef'
import {MayRef} from 'src/types'
import {computed, isReadonly, isRef, Ref, ref, watchEffect} from 'vue-demi'
import {unwrapRef} from '../unwrap-ref'

export type RefWithInit<T, P> =
  P extends undefined ? Ref<T> : Ref<NotUndefined<T> | P>

export interface WrapRefOptions<P> {
  /**
   * Use with caution. Updating the returned Ref updates the value of Ref argument
   * 주의 하여 사용 하세요. return Ref 를 업데이트 하는 것은 value Ref argument 를 업데이트 할 것입니다
   * bind 하지 않기 위해서 wrapRef(computed(() => (value.value)) 도 좋은 방법 입니다.
   * @default true
   */
  bindValue?: boolean
  defaultValue?: P | undefined
  /**
   * @deprecated please use defaultValue
   */
  initState?: P | undefined
}

/**
 * Makes a ref value with a value, ref value, toRef value or computed value
 * @param value
 * @param options ref to WrapRefOptions
 */
export const wrapRef = <T,
  P = T>(
    value?: MayRef<T>,
    options: WrapRefOptions<P> = {},
  ): RefWithInit<T, P> => {
  const {bindValue = true, initState, defaultValue} = options
  const valueRef = ref<any>(unwrapRef(value) ?? defaultValue ?? initState)

  const _isRef = isRef(value)

  const isReadonlyValue = !_isRef || isToRef(value) || isReadonly(value)

  if (_isRef) {
    watchEffect(() => {
      valueRef.value = unwrapRef(value) ?? defaultValue ?? initState
    }, {
      flush: 'sync',
    })
  }

  return computed({
    get: () => {
      return valueRef.value
    },
    set: (_value: any) => {
      valueRef.value = _value
      if (!bindValue || isReadonlyValue) {
        return
      }
      (value as any).value = _value
    },
  }) as any
}

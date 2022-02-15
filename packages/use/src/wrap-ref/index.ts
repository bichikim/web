import {NotUndefined} from '@winter-love/utils'
import {isToRef} from 'src/isToRef'
import {MayRef} from 'src/types'
import {computed, isReadonly, isRef, ref, Ref, unref, watchEffect} from 'vue-demi'

export type RefWithInit<T, P> =
  P extends undefined ? Ref<T> : Ref<NotUndefined<T> | P>

export interface WrapRefOptions<P> {
  /**
   * use with caution. Updating the returned Ref is going to update the value of Ref argument
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
 * makes a raw value, a ref value, a toRef value or a computed value into a ref value
 * @param value
 * @param options ref to WrapRefOptions
 */
export const wrapRef = <T,
  P = T>(
    value?: MayRef<T>,
    options: WrapRefOptions<P> = {},
  ): RefWithInit<T, P> => {
  const {bindValue = true, initState, defaultValue} = options
  const valueRef = ref<any>(unref(value) ?? defaultValue ?? initState)

  const _isRef = isRef(value)

  // todo check this logic
  const isReadonlyValue = !_isRef || isReadonly(value) || isToRef(value)

  if (_isRef) {
    watchEffect(() => {
      valueRef.value = unref(value) ?? defaultValue ?? initState
    }, {
      flush: 'sync',
    })
  }

  return computed({
    get: () => {
      return valueRef.value
    },
    set: (newValue: any) => {
      valueRef.value = newValue
      if (bindValue && !isReadonlyValue) {
        (value as any).value = newValue
      }
    },
  }) as any
}

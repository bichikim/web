import {NotUndefined} from '@winter-love/utils'
import {MayRef} from 'src/types'
import {unwrapRef} from 'src/unwrap-ref'
import {computed, isReadonly, isRef, ref, Ref, watchEffect} from 'vue-demi'

export type RefWithInit<T, P> = P extends undefined ? Ref<T> : Ref<NotUndefined<T> | P>

export interface WrapRefOptions<P> {
  defaultValue?: P | undefined
}

/**
 * makes a raw value, a ref value, a toRef value or a computed value into a ref value
 * @param value
 * @param options ref to WrapRefOptions
 */
export const wrapRef = <T, P = T>(
  value?: MayRef<T>,
  options: WrapRefOptions<P> = {},
): RefWithInit<T, P> => {
  const {defaultValue} = options
  const valueMut = ref<any>(unwrapRef(value))
  const _isUpdateAble = !isReadonly(value) && isRef(value)

  const changeValue = (value) => {
    valueMut.value = value
  }

  if (isRef(value)) {
    watchEffect(
      () => {
        changeValue(value.value)
      },
      {flush: 'sync'},
    )
  }

  if (typeof valueMut.value === 'undefined') {
    valueMut.value = defaultValue
  }

  return computed({
    get: () => {
      return valueMut.value
    },
    set: (newValue: any) => {
      if (_isUpdateAble) {
        ;(value as any).value = newValue
      }
      valueMut.value = newValue
    },
  }) as any
}

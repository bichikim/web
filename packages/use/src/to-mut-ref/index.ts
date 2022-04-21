import {computed, isReadonly, ref, unref, watchEffect, WritableComputedRef} from 'vue-demi'

export type IsEqual<Value> = (value: Value, oldValue: Value) => boolean

export interface ToMutRefProps<Props extends Record<string, any>, Key extends keyof Props> {
  /**
   * @deprecated
   */
  shouldUpdate?: IsEqual<Props[Key]>
}

export type ToMutRefHandle<Props extends Record<string, any>, Key extends keyof Props> = (data: Props[Key]) => any

/**
 * toMutRef 는 vue 에 toRef 와 달리 readonly 를 안전하게 처리하고 값을 변경 할 수 있습니다  readonly 일경우 props 는 변경하지 않습니다
 * @param props
 * @param key
 * @useful ⭐⭐⭐⭐
 */
export const toMutRef = <Props extends Record<string, any>, Key extends keyof Props>(
  props: Props,
  key: Key,
): WritableComputedRef<Props[Key]> => {
  const valueMut = ref(unref(props[key]))
  const _isReadonly = isReadonly(props)

  const changeValue = (value) => {
    valueMut.value = value
  }

  watchEffect(() => {
    changeValue(props[key])
  }, {flush: 'sync'})

  return computed<Props[Key]>({
    get() {
      return valueMut.value
    },
    set(value) {
      if (!_isReadonly) {
        props[key] = value
      }
      valueMut.value = value
    },
  })
}

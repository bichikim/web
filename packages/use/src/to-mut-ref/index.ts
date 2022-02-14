import {
  Ref, ref, toRef, watchEffect,
} from 'vue-demi'

export type IsEqual<Value> = (value: Value, oldValue: Value) => boolean

export interface ToMutRefProps<Props extends Record<string, any>, Key extends keyof Props> {
  /**
   * @deprecated
   */
  shouldUpdate?: IsEqual<Props[Key]>
}

export type ToMutRefHandle<Props extends Record<string, any>, Key extends keyof Props> = (data: Props[Key]) => any

/**
 * toMutRef 는 vue 에 toRef 와 달리 readonly 가 아닙니다 리턴된 ref 값은 변경 가능합니다
 * @param props
 * @param key
 * @param options
 * @useful ⭐⭐⭐⭐
 */
export const toMutRef = <Props extends Record<string, any>, Key extends keyof Props>(
  props: Props,
  key: Key,
): Ref<Props[Key]> => {
  const valueRef = toRef(props, key)
  const valueMut = ref<Props[Key]>(valueRef.value)

  const changeValue = (value) => {
    valueMut.value = value
  }

  watchEffect(() => {
    changeValue(valueRef.value)
  }, {
    flush: 'sync',
  })

  return valueMut
}

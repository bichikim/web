import {
  Ref, ref, toRef, watch,
} from 'vue-demi'

export type IsEqual<Value> = (value: Value, oldValue: Value) => boolean

export interface ToMutRefProps<Props extends Record<string, any>, Key extends keyof Props> {
  shouldUpdate?: IsEqual<[Props[Key]]>
}

export type ToMutRefHandle<Props extends Record<string, any>, Key extends keyof Props> = (data: Props[Key]) => any

/**
 * toMutRef 는 vue 에 toRef 와 달리 readonly 가 아닙니다 리턴된 ref 값은 변경 가능합니다
 * @param props
 * @param key
 * @param handle
 * @param options
 */
export const toMutRef = <Props extends Record<string, any>, Key extends keyof Props>(
  props: Props,
  key: Key,
  handle?: ToMutRefHandle<Props, Key>,
  options: ToMutRefProps<Props, Key> = {},
): Ref<Props[Key]> => {
  const {shouldUpdate} = options
  const valueRef = toRef(props, key)
  const valueMut = ref<Props[Key]>(valueRef.value)

  watch(valueRef, (value: Props[Key], oldValue: Props[Key]) => {
    if (shouldUpdate) {
      if (shouldUpdate(value, oldValue)) {
        valueMut.value = value
        return
      }
      return
    }
    valueMut.value = value
  })

  watch(valueMut, (value: Props[Key]) => {
    handle?.(value)
  })

  return valueMut
}

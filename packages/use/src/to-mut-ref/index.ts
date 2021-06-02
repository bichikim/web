import {ref, watch, toRef, Ref} from 'vue'

export type IsEqual<Value> = (value: Value, oldValue: Value) => boolean

/**
 * toMutRef is not readonly unlike toRef in vue. The returned ref value is mutable.
 * @param props
 * @param key
 * @param isEqual If this function is provided, the value is updated with a new value after checking through this function. If not provided, the value is always updated with the new value.
 */
export const toMutRef = <Props extends Record<string, any>, Key extends keyof Props>(
  props: Props,
  key: Key,
  isEqual?: IsEqual<[Props[Key]]>,
): Ref<Props[Key]> => {
  const valueRef = toRef(props, key)
  const valueMut = ref<Props[Key]>(valueRef.value)

  watch(valueRef, (value: [Props[Key]], oldValue: [Props[Key]]) => {
    if (isEqual) {
      if (isEqual(value, oldValue)) {
        valueMut.value = value
        return
      }
      return
    }
    valueMut.value = value
  })

  return valueMut
}

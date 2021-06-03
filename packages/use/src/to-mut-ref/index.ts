import {ref, watch, toRef, Ref} from 'vue-demi'

export type IsEqual<Value> = (value: Value, oldValue: Value) => boolean

export type ToMutRefReturnType<Props extends Record<string, any>, Key extends keyof Props> = Ref<Props[Key]>
/**
 * toMutRef 는 vue 에 toRef 와 달리 readonly 가 아닙니다 리턴된 ref 값은 변경 가능합니다
 * @param props
 * @param key
 * @param isEqual 변경 할지 결정하는 함수가 있을 경우 확인 후 업데이트 합니다 이 함수를 제공하지 않으면 항상 업데이트 합니다
 */
export const toMutRef = <Props extends Record<string, any>, Key extends keyof Props>(
  props: Props,
  key: Key,
  isEqual?: IsEqual<[Props[Key]]>,
): ToMutRefReturnType<Props, Key> => {
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

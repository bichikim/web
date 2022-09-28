import {ComputedRef, ref, Ref, watch, WritableComputedRef} from 'vue'

export type RefSource<T> = Ref<T> | WritableComputedRef<T> | ComputedRef<T>

/**
 * 여러 묶음의 ref 가 1개의 ref 로 반환 됩니다 초기 값은 undefined 가 아닌 가장 마지막 매개변수 입니다
 * @param args
 */
export const bunchRef = <T>(...args: RefSource<T>[]): Ref<T> => {
  const valueRef = ref()

  const update = (value: T) => {
    valueRef.value = value
  }

  args.forEach((argRef) => {
    watch(argRef, update, {flush: 'sync'})
    const _value = argRef.value
    if (typeof _value !== 'undefined') {
      valueRef.value = _value
    }
  })

  return valueRef
}

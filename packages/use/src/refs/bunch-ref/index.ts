import {ComputedRef, ref, Ref, watch, WritableComputedRef} from 'vue'

export type RefSource<T> = Ref<T> | WritableComputedRef<T> | ComputedRef<T>

/**
 * 여러 묶음의 refs 가 1개의 ref 로 반환 됩니다
 * 초기 값은 undefined 가 아닌 가장 마지막 매개변수 입니다
 * 값들 중 바뀐 값 중 마지막 값이 최종 값이 됩니다
 * 이 리턴하는 ref 수정이 되지만 original ref 들을 변경하지 않습니다
 * 이 함수는 mutRef 와 같이 작동합니다 하지만 이 함수는 여러 ref 를 매개변수로 받을 수 있습니다
 * @param args
 */
export const bunchRef = <T>(...args: RefSource<T>[]): Ref<T> => {
  const valueRef = ref()

  const update = (value: T) => {
    valueRef.value = value
  }

  args.forEach((arg) => {
    watch(arg, update, {flush: 'sync'})
    /**
     * update first value
     */
    const _value = arg.value
    if (_value !== undefined) {
      valueRef.value = _value
    }
  })

  return valueRef
}

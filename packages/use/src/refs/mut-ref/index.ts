import {Ref, ref, watchEffect} from 'vue'
import {MaybeRef} from 'src/types'
import {unref} from 'src/refs/unref'

/**
 * 단방향 ref 연결 ref 를 생성 합니다 반환된 ref 는 변경이 가능하지만 연결된 ref 를 변경 하지 않습니다
 * 적당한 이름을 뭐로 하지?
 * @param value
 */
export const mutRef = <T>(value?: MaybeRef<T>): Ref<T | undefined> => {
  const refValue = ref<T>()

  const update = (_value?: T) => {
    refValue.value = _value
  }

  watchEffect(
    () => {
      update(unref(value))
    },
    {
      flush: 'sync',
    },
  )

  return refValue
}

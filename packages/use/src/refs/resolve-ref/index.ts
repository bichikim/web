import {MaybeRef} from 'src/types'
import {computed, isRef, Ref} from 'vue'
import {isWritableRef} from 'src/checks/is-writable-ref'

/**
 * ref 여 부와 상관 없이 computed ref 로 만들어 반환 합니다
 * ref 일 경우 ref 가 변경되면 computed ref 도 변경 됩니다
 * @param value
 * @param updateOrigin value 가 ref 일경우 업데이트 할지 여부 입니다
 */
export function resolveRef<T>(value: MaybeRef<T>, updateOrigin: boolean = false): Ref<T> {
  const createGet = () => {
    if (isRef(value)) {
      return () => {
        return value.value
      }
    }
    return () => {
      return value
    }
  }

  const createSet = () => {
    if (updateOrigin && isWritableRef(value)) {
      return (_value: T) => {
        ;(value as any).value = _value
      }
    }
    return () => {
      // empty skip write
    }
  }

  return computed({
    get: createGet(),
    set: createSet(),
  })
}

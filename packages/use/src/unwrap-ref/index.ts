import {isRef} from 'vue-demi'
import {MayRef} from 'src/types'

/**
 * Ref 여부와 상관 없이 값을 가져옵니다
 * @param value 값을 가져올 값 입니다
 */
export const unwrapRef = <T>(value: MayRef<T>): T => {
  if (isRef(value)) {
    return value.value
  }
  return value
}

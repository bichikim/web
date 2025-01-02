import {EmptyObject} from '@winter-love/utils'
import {isRef, reactive, unref} from 'vue'
import {toEachRefs} from 'src/refs/to-each-refs'
import {MaybeRef} from 'src/types'

export interface ToReactive {
  <T extends Record<any, any>>(value: MaybeRef<T>): T

  <T extends string | number | symbol | boolean | ((...args) => any)>(
    value: T,
  ): EmptyObject
}

/**
 * ref computed 또는 reactive 를 reactive 로 변경 합니다
 * reactive 가 아닌 ref 들은 값이 오브젝트가 아니면 빈 reactive 를 반환 합니다
 * @param value
 */
export const toReactive: ToReactive = (value: MaybeRef<any>): any => {
  if (isRef(value)) {
    const data = unref(value)

    if (data !== null && typeof data === 'object') {
      return reactive(toEachRefs(value))
    }

    return reactive({})
  }

  return reactive(value)
}

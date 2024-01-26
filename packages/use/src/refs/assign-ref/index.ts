import {computed, isRef, unref} from 'vue'
import {MaybeRef} from 'src/types'

export interface AssignRef {
  <T1>(arg1: MaybeRef<T1>): T1
  <T1, T2>(arg1: MaybeRef<T1>, arg2: MaybeRef<T2>): T1 & T2
  <T1, T2, T3>(arg1: T1, arg2: T2, arg3: T3): T1 & T2 & T3
  <T1, T2, T3, T4>(arg1: T1, arg2: T2, arg3: T3, arg4: T4): T1 & T2 & T3 & T4

  <T extends any[]>(...args: T): any
}

/**
 * object ref 또는 reactive 를 assign 하고 ref 로 반환합니다
 * @param args
 */
export const assignRef: AssignRef = (...args) => {
  const _args = args.filter((arg) => {
    if (isRef(arg)) {
      return typeof unref(arg) === 'object'
    }
    return true
  })
  return computed(() => {
    return Object.fromEntries(
      _args.reduce((result, arg) => {
        return [...result, ...Object.entries(unref(arg))]
      }, []),
    )
  })
}

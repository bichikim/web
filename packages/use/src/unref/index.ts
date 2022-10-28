import {unref as _unref} from 'vue'
import {MaybeRef} from 'src/types'

export const unref = <T>(value: MaybeRef<T>): T => {
  return _unref(value) as any
}

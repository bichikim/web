import {getItem, setItem} from '@winter-love/utils'
import {computed, Ref, WritableComputedRef} from 'vue'

export const bindDeep = <T, P = any>(item: Ref<T>, path: string[]): WritableComputedRef<P> => {
  return computed({
    get() {
      return getItem(item.value, path)
    },
    set(value) {
      setItem(item.value, path, value)
    },
  })
}

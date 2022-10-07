import type {WritableComputedRef} from 'vue'
import type {Computed} from './computed'

export interface WriteComputed<T = any> {
  get: () => T
  set: (value: T) => void
}

export type Batch<T = any> = (callback: () => T) => T

export const createWriteComputed = (computed: Computed, batch: Batch) => {
  return <T>(compute: WriteComputed<T>): WritableComputedRef<T> => {
    const computedRef = computed(compute.get)
    return new Proxy(
      {},
      {
        get(target, prop) {
          if (prop === 'value') {
            return computedRef.value
          }
          return Reflect.get(target, prop)
        },
        set(target, prop, value) {
          if (prop === 'value') {
            batch(() => {
              compute.set(value)
            })
            return true
          }
          return false
        },
      },
    ) as any
  }
}

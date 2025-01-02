import {EmptyObject} from '@winter-love/utils'
import {computed, Ref, unref, WritableComputedRef} from 'vue'

export type RefToRefs<T = any> = T extends object
  ? {
      [key in keyof T]: WritableComputedRef<T[key]>
    }
  : EmptyObject
export const toEachRefs = <T>(value: Ref<T>): RefToRefs<T> => {
  const data: T = unref(value)

  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.keys(data).map((key) => {
        return [
          key,
          computed({
            get: () => {
              return unref(value)[key]
            },
            set: () => {
              value.value = {
                ...unref(value),
                [key]: data[key],
              }
            },
          }),
        ]
      }),
    ) as any
  }

  return {} as any
}

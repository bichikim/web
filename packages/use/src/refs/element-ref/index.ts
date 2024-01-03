import {resolveElement} from 'src/utils'
import {computed, ref, WritableComputedRef} from 'vue'
import {MaybeElement} from 'src/types'

export const elementRef = (): WritableComputedRef<HTMLElement | null | undefined> => {
  const elementRef = ref<MaybeElement>(null)
  return computed({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: () => resolveElement(elementRef.value as any),
    set: (value: MaybeElement) => {
      elementRef.value = value
    },
  })
}
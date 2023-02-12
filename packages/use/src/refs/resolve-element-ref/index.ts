import {resolveElement} from 'src/utils/resolve-element'
import {MaybeElement, MaybeRef} from 'src/types'
import {computed, ComputedRef} from 'src/_imports/vue'
import {resolveRef} from 'src/refs/resolve-ref'

export const resolveElementRef = (
  value: MaybeRef<MaybeElement>,
): ComputedRef<HTMLElement | null | undefined> => {
  const maybeElement = resolveRef(value)

  return computed(() => {
    return resolveElement(maybeElement.value)
  })
}

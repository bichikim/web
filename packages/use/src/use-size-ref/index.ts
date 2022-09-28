import {useEvent} from 'src/use-event'
import {getElementSize, Rect} from '@winter-love/utils'
import {ref, Ref} from 'vue'
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/resolve-ref'

const DEFAULT_SIZE: Rect = {height: 0, width: 0, x: 0, y: 0}

export const useSizeRef = (
  element: MaybeRef<HTMLElement>,
  container: MaybeRef<HTMLElement | Window> = window,
  defaultSizeRef: Ref<Rect> = ref(DEFAULT_SIZE),
): Ref<Rect> => {
  const elementRef = resolveRef(element)
  const containerRef = resolveRef(container)
  const result = ref(getElementSize(elementRef?.value))

  useEvent(window, 'resize', () => {
    result.value = getElementSize(elementRef.value, defaultSizeRef.value)
  })

  // todo type error
  useEvent(containerRef as any, 'scroll', () => {
    result.value = getElementSize(elementRef.value, defaultSizeRef.value)
  })

  return result
}

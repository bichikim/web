import {useEvent} from 'src/use-event'
import {getElementSize, Rect} from '@winter-love/utils'
import {computed, Ref, ref} from 'vue'
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/resolve-ref'
import {onElementResize} from 'src/on-element-resize'

const DEFAULT_SIZE: Rect = {height: 0, width: 0, x: 0, y: 0}

export const useSizeRef = (
  element: MaybeRef<HTMLElement | Window>,
  container: MaybeRef<HTMLElement | Window> = window,
  isActive: MaybeRef<boolean> = true,
  defaultSize: MaybeRef<Rect> = DEFAULT_SIZE,
): Ref<Rect> => {
  const elementRef = resolveRef(element)
  const containerRef = resolveRef(container)
  const result = ref(getElementSize(elementRef?.value))
  const defaultSizeRef = resolveRef(defaultSize)
  const isActiveRef = resolveRef(isActive)

  const updateSize = () => {
    result.value = getElementSize(elementRef.value, defaultSizeRef.value)
  }

  useEvent(window, 'resize', updateSize, isActiveRef)

  useEvent(containerRef, 'scroll', updateSize, isActiveRef)

  const elementNotWindowRef = computed<HTMLElement | undefined>(() => {
    const element = elementRef.value
    if (element instanceof Window) {
      return
    }
    return element
  })
  const containerNotWindowRef = computed<HTMLElement | undefined>(() => {
    const container = containerRef.value
    if (container instanceof Window) {
      return
    }
    return container
  })

  onElementResize(elementNotWindowRef, updateSize)
  onElementResize(containerNotWindowRef, updateSize)

  return result
}

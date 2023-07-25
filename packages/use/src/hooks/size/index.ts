import {onEvent} from 'src/hooks/event'
import {getElementSize, Rect} from '@winter-love/utils'
import {computed, Ref, ref, toRef} from 'vue'
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/refs/resolve-ref'
import {onElementResize} from 'src/hooks/element-resize'
import {useThrottle} from 'src/hooks/throttle'

const DEFAULT_SIZE: Rect = {height: 0, width: 0, x: 0, y: 0}
const DEFAULT_DELAY = 0

export interface UseSizeOptions {
  defaultSize?: Rect
  delay?: number
  isActive?: boolean
}

export const useSize = (
  element: MaybeRef<HTMLElement | Window | null>,
  container: MaybeRef<HTMLElement | Window> = window,
  options: UseSizeOptions = {},
): Ref<Rect> => {
  const elementRef = resolveRef(element)
  const containerRef = resolveRef(container)
  const result = ref(getElementSize(elementRef?.value))
  const defaultSizeRef = toRef(options, 'defaultSize', DEFAULT_SIZE)
  const isActiveRef = toRef(options, 'isActive', true)
  const delayRef = toRef(options, 'delay', DEFAULT_DELAY)
  const elementNotWindowRef = computed<HTMLElement | undefined | null>(() => {
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

  const updateSize = useThrottle(() => {
    const element = elementRef.value
    if (element) {
      result.value = getElementSize(elementRef.value, defaultSizeRef.value)
    }
  }, delayRef)

  // onEvent(window, 'resize', updateSize, isActiveRef)
  // onEvent(containerRef, 'scroll', updateSize, isActiveRef)
  onElementResize(elementNotWindowRef, updateSize)
  onElementResize(containerNotWindowRef, updateSize)

  return result
}

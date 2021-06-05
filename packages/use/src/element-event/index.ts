import {onMounted, onUnmounted, ref, watch} from 'vue-demi'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {isInInstance} from 'src/is-in-instance'

export type Listener<ElementEvent> = (event: ElementEvent) => any

export interface UseElementEventOptions {
  immediate?: boolean | 'mounted'
  once?: boolean
  passive?: boolean
  capture?: boolean
}

export interface UseElementEventReturnType {
  active: () => void
  inactive: () => void
}

export function useElementEvent <Key extends keyof WindowEventMap>(
  window: MayRef<Window>,
  eventName: Key,
  listener: Listener<WindowEventMap[Key]>,
  options?: UseElementEventOptions,
): UseElementEventReturnType
export function useElementEvent <Key extends keyof HTMLElementEventMap>(
  element: MayRef<HTMLElement>,
  eventName: Key,
  listener: Listener<HTMLElementEventMap[Key]>,
  options?: UseElementEventOptions,
): UseElementEventReturnType
export function useElementEvent <Key extends string>(
  element: MayRef<HTMLElement | Window>,
  eventName: Key,
  listener: Listener<Event>,
  options: UseElementEventOptions = {},
): UseElementEventReturnType {
  const {immediate = true, once = false, passive = true, capture = false} = options
  const _isInInstance = isInInstance()
  const elementRef = wrapRef(element)
  const isActive = ref(false)

  const handler = (event) => {
    listener(event)
    if (once) {
      inactive()
    }
  }

  const active = () => {
    const element = elementRef.value
    if (element) {
      isActive.value = true
      element.addEventListener(eventName, handler, {
        passive,
        capture,
      })
    }
  }

  const inactive = () => {
    const element = elementRef.value
    if (element) {
      isActive.value = false
      element.removeEventListener(eventName, handler)
    }
  }

  watch(elementRef, () => {
    if (isActive.value) {
      inactive()
      active()
    }
  })

  if (immediate === 'mounted' && _isInInstance) {
    onMounted(() => {
      active()
    })
  } else if (immediate) {
    active()
  }

  if (_isInInstance) {
    onUnmounted(() => {
      inactive()
    })
  }

  return {
    active,
    inactive,
  }
}

import {
  onMounted, onUnmounted, ref, watch,
} from 'vue-demi'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {isInInstance} from 'src/is-in-instance'
import {freeze} from '@winter-love/utils'

export type Listener<ElementEvent> = (event: ElementEvent) => any

export interface UseElementEventOptions {
  capture?: boolean
  immediate?: boolean | 'mounted'
  once?: boolean
  passive?: boolean
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
  const {
    immediate = true, once = false, passive = true, capture = false,
  } = options
  const _isInInstance = isInInstance()
  const elementRef = wrapRef(element)
  const isActive = ref(false)

  const handle = (event) => {
    listener(event)
    if (once) {
      inactive()
    }
  }

  const active = () => {
    const element = elementRef.value
    if (element) {
      isActive.value = true
      element.addEventListener(eventName, handle, {
        capture,
        passive,
      })
    }
  }

  const inactive = () => {
    const element = elementRef.value
    if (element) {
      isActive.value = false
      element.removeEventListener(eventName, handle)
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

  return freeze({
    active,
    inactive,
  })
}

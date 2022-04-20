/* eslint-disable max-params */
import {MayRef} from 'src/types'
import {unwrapRef} from 'src/unwrap-ref'
import {wrapRef} from 'src/wrap-ref'
import {computed, getCurrentInstance, onMounted, onScopeDispose, Ref, watch} from 'vue-demi'

export type Listener<ElementEvent> = (event: ElementEvent) => any

export interface UseElementEventOptions {
  capture?: boolean
  once?: boolean
  passive?: boolean
}

export function useElementEvent<Key extends keyof DocumentEventMap>(
  document: MayRef<Document | undefined>,
  eventName: Key,
  listener: Listener<DocumentEventMap[Key]>,
  isActive?: MayRef<boolean | undefined>,
  options?: UseElementEventOptions,
)
export function useElementEvent<Key extends keyof WindowEventMap>(
  window: MayRef<Window | undefined>,
  eventName: Key,
  listener: Listener<WindowEventMap[Key]>,
  isActive?: MayRef<boolean | undefined>,
  options?: UseElementEventOptions,
): Ref<boolean>
export function useElementEvent<Key extends keyof HTMLElementEventMap>(
  element: MayRef<HTMLElement>,
  eventName: Key,
  listener: Listener<HTMLElementEventMap[Key]>,
  isActive?: MayRef<boolean | undefined>,
  options?: UseElementEventOptions,
): Ref<boolean>
export function useElementEvent<Key extends string>(
  element: MayRef<HTMLElement | Window | Document | undefined>,
  eventName: Key,
  listener: Listener<Event>,
  isActive?: MayRef<boolean | undefined>,
  options: UseElementEventOptions = {},
): Ref<boolean> {
  const {
    once = false, passive = true, capture = false,
  } = options
  const instance = getCurrentInstance()
  const isInInstance = Boolean(instance)
  const elementRef = computed(() => {
    return unwrapRef(element)
  })
  const isActiveRef = wrapRef(isActive, {defaultValue: true})

  const handle = (event) => {
    listener(event)
    if (once) {
      inactive()
    }
  }

  const active = () => {
    const element = elementRef.value
    if (element) {
      isActiveRef.value = true
      element.addEventListener(eventName, handle, {
        capture,
        passive,
      })
    }
  }

  const inactive = () => {
    isActiveRef.value = false
    const element = elementRef.value
    if (element) {
      element.removeEventListener(eventName, handle)
    }
  }

  watch(elementRef, () => {
    if (isActiveRef.value) {
      inactive()
      active()
    }
  })

  watch(isActiveRef, (value) => {
    if (value) {
      active()
    } else {
      inactive()
    }
  })

  if (isActiveRef.value) {
    if (isInInstance) {
      onMounted(() => {
        active()
      })
    } else {
      active()
    }
  }
  onScopeDispose(() => {
    inactive()
  })

  return isActiveRef
}

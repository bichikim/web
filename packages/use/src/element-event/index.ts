/* eslint-disable max-params */
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {getCurrentInstance, onMounted, onUnmounted, Ref, watch} from 'vue-demi'

export type Listener<ElementEvent> = (event: ElementEvent) => any

export interface UseElementEventOptions {
  capture?: boolean
  once?: boolean
  passive?: boolean
}

export interface UseElementEventReturnType {
  /**
   * @deprecated use isActive
   */
  active: () => void
  /**
   * @deprecated use isActive
   */
  inactive: () => void
  /**
   * 이벤트 구독 활성화 여부
   */
  isActive: Ref<boolean>
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
  const elementRef = wrapRef(element, {bindValue: false})
  const isActiveRef = wrapRef(isActive, {initState: true})

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
  if (isInInstance) {
    onUnmounted(() => {
      inactive()
    })
  }

  return isActiveRef
}

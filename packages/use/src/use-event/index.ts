/* eslint-disable max-params */
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/resolve-ref'
import {defaultRef} from 'src/default-ref'
import {bindRef} from 'src/bind-ref'
import {getCurrentInstance, onMounted, onScopeDispose, Ref, watch} from 'vue'

export type Listener<ElementEvent> = (event: ElementEvent) => any

export interface UseElementEventOptions {
  capture?: boolean
  once?: boolean
  passive?: boolean
}

export function useEvent<Key extends keyof WindowEventMap>(
  window: MaybeRef<Window | undefined | null>,
  eventName: Key,
  listener: Listener<WindowEventMap[Key]>,
  isActive?: MaybeRef<boolean | undefined>,
  options?: UseElementEventOptions,
): Ref<boolean>
export function useEvent<Key extends keyof HTMLElementEventMap>(
  element: MaybeRef<HTMLElement | undefined | null>,
  eventName: Key,
  listener: Listener<HTMLElementEventMap[Key]>,
  isActive?: MaybeRef<boolean | undefined>,
  options?: UseElementEventOptions,
): Ref<boolean>
export function useEvent<Key extends keyof HTMLElementEventMap & keyof WindowEventMap>(
  element: MaybeRef<HTMLElement | Window | undefined | null>,
  eventName: Key,
  listener: Listener<HTMLElementEventMap[Key] | WindowEventMap[Key]>,
  isActive?: MaybeRef<boolean | undefined>,
  options?: UseElementEventOptions,
): Ref<boolean>
export function useEvent<Key extends keyof DocumentEventMap>(
  document: MaybeRef<Document | undefined | null>,
  eventName: Key,
  listener: Listener<DocumentEventMap[Key]>,
  isActive?: MaybeRef<boolean | undefined>,
  options?: UseElementEventOptions,
)
export function useEvent<Key extends string>(
  element: MaybeRef<HTMLElement | Window | Document | undefined | null>,
  eventName: Key,
  listener: Listener<Event>,
  isActive?: MaybeRef<boolean | undefined>,
  options: UseElementEventOptions = {},
): Ref<boolean> {
  const {once = false, passive = true, capture = false} = options
  const instance = getCurrentInstance()
  const isInInstance = Boolean(instance)
  const elementRef = resolveRef(element)
  const isActiveRef = bindRef(defaultRef(resolveRef(isActive), () => true))

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

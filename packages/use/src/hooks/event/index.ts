import {eventOptions, getWindow} from '@winter-love/utils'
import {
  computed,
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  reactive,
  watch,
} from 'vue'
import {resolveRef} from 'src/refs/resolve-ref'
import {mutRef} from 'src/refs/mut-ref'
import {MaybeRef, ReactiveOptions} from 'src/types'

export type Listener<ElementEvent> = (event: ElementEvent) => any

export interface UseElementEventOptions {
  capture?: boolean
  /**
   * @default true
   */
  isActive?: boolean
  once?: boolean
  passive?: boolean
}

export function onEvent<Key extends keyof WindowEventMap>(
  window: MaybeRef<Window | undefined | null>,
  eventName: Key,
  listener: Listener<WindowEventMap[Key]>,
  options?: ReactiveOptions<UseElementEventOptions>,
): void
export function onEvent<Key extends keyof HTMLElementEventMap>(
  element: MaybeRef<HTMLElement | undefined | null>,
  eventName: Key,
  listener: Listener<HTMLElementEventMap[Key]>,
  options?: ReactiveOptions<UseElementEventOptions>,
): void
export function onEvent<Key extends keyof DocumentEventMap>(
  document: MaybeRef<Document | undefined | null>,
  eventName: Key,
  listener: Listener<DocumentEventMap[Key]>,
  options?: ReactiveOptions<UseElementEventOptions>,
): void
export function onEvent<Key extends string>(
  element: MaybeRef<HTMLElement | Window | Document | undefined | null>,
  eventName: Key,
  listener: Listener<Event>,
  options: ReactiveOptions<UseElementEventOptions> = {},
): void {
  const reactiveOptions = reactive(options)
  const instance = getCurrentInstance()
  const isInInstance = Boolean(instance)
  const elementRef = resolveRef(element)
  const isActiveRef = mutRef(computed(() => reactiveOptions.isActive ?? true))
  const handle = (event) => {
    listener(event)

    if (reactiveOptions.once) {
      inactive()
    }
  }

  const active = () => {
    const element = elementRef.value

    if (element && getWindow()) {
      isActiveRef.value = true
      element.addEventListener?.(
        eventName,
        handle,
        eventOptions({
          capture: reactiveOptions.capture,
          passive: reactiveOptions.passive,
        }),
      )
    }
  }

  const inactive = () => {
    isActiveRef.value = false
    const element = elementRef.value

    if (element && getWindow()) {
      element.removeEventListener?.(eventName, handle)
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
}

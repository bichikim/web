import {isSSR} from 'src/_imports/utils'
import {mutRef} from 'src/refs'
import {getComponentElement} from 'src/utils/get-component-element'
import {MaybeElement} from 'src/types'
import {onEvent} from 'src/hooks/event'
import {computed, Ref} from 'vue'

export type OnClickOutsideHandle<Event extends keyof WindowEventMap> = (
  event: WindowEventMap[Event],
) => unknown

export interface OnClickOutsideOptions<Event extends keyof WindowEventMap> {
  event?: Event
}

/**
 * @useful ⭐⭐⭐⭐
 */
export const onClickOutside = <Event extends keyof WindowEventMap = 'pointerdown'>(
  target: Ref<MaybeElement>,
  handle: OnClickOutsideHandle<Event>,
  options: OnClickOutsideOptions<Event> = {},
) => {
  const {event = 'pointerdown'} = options

  const targetRef = mutRef(target)

  const elementRef = computed(() => {
    return getComponentElement(targetRef.value)
  })

  const listener = (event: WindowEventMap[Event]) => {
    const element = elementRef.value
    if (!element) {
      return
    }

    if (element === event.target || event.composedPath().includes(element)) {
      return
    }

    handle(event)
  }

  return onEvent<Event>(isSSR() ? undefined : window, event as Event, listener, true, {
    passive: true,
  })
}
import {computed, Ref} from 'vue'
import {useEvent} from 'src/use-event'
import {pickElement} from 'src/pick-element'
import {PossibleElement} from 'src/types'
import {bindRef} from 'src/bind-ref'
import {isSSR} from '@winter-love/utils'

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
  target: Ref<PossibleElement>,
  handle: OnClickOutsideHandle<Event>,
  options: OnClickOutsideOptions<Event> = {},
) => {
  const {event = 'pointerdown'} = options

  const targetRef = bindRef(target)

  const elementRef = computed(() => {
    return pickElement(targetRef.value)
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

  return useEvent<Event>(isSSR() ? undefined : window, event as Event, listener, true, {
    passive: true,
  })
}

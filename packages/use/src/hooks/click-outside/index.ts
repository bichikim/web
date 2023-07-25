import {isSSR} from '@winter-love/utils'
import {mutRef} from 'src/refs'
import {resolveElement} from 'src/utils/resolve-element'
import {MaybeElement} from 'src/types'
import {onEvent} from 'src/hooks/event'
import {computed, Ref} from 'vue'

export type OnClickOutsideHandle<Event extends keyof WindowEventMap> = (
  event: WindowEventMap[Event],
) => unknown

export interface OnClickOutsideOptions<Event extends keyof WindowEventMap> {
  event?: Event
}

export const onClickOutside = <Event extends keyof WindowEventMap = 'pointerdown'>(
  target: Ref<MaybeElement>,
  handle: OnClickOutsideHandle<Event>,
  options: OnClickOutsideOptions<Event> = {},
) => {
  const {event = 'pointerdown'} = options

  const targetRef = mutRef(target)

  const elementRef = computed(() => {
    return resolveElement(targetRef.value)
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

  return onEvent<Event>(isSSR() ? undefined : window, event as Event, listener, {
    passive: true,
  })
}

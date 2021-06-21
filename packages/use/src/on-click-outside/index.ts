import {computed} from 'vue-demi'
import {MayRef, PossibleElement} from '../types'
import {isSSR} from '@winter-love/utils'
import {wrapRef} from '../wrap-ref'
import {pickElement} from '../pick-element'
import {useElementEvent} from '../element-event'

export type OnClickOutsideHandle<Event extends keyof WindowEventMap> = (event: WindowEventMap[Event]) => unknown

export interface OnClickOutsideOptions<Event extends keyof WindowEventMap> {
  event?: Event
}

export const onClickOutside = <Event extends keyof WindowEventMap = 'pointerdown'>(
  target: MayRef<PossibleElement>,
  handle: OnClickOutsideHandle<Event>,
  options: OnClickOutsideOptions<Event> = {},
) => {
  if (isSSR()) {
    return
  }

  const {event = 'pointerdown'} = options

  const targetRef = wrapRef(target)

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

  return useElementEvent<Event>(window, event as Event, listener, {passive: true})
}

// recipe

import {getWindow} from '@winter-love/utils'

export interface Emitter<
  EventName extends string,
  EVentMap extends Record<EventName, any>,
> extends EmitterListener<EventName, EVentMap> {
  clear: () => void
  emit<E extends EventName>(event: EventName, payload: EVentMap[E]): void
}

export interface EmitterListener<
  EventName extends string,
  EVentMap extends Record<EventName, any>,
> {
  addEventListener<E extends EventName>(
    event: E,
    listener: (payload: EVentMap[E]) => void,
  ): void
  removeEventListener<E extends EventName>(
    event: E,
    listener: (payload: EVentMap[E]) => void,
  ): void
}

export const createEmitter = <
  EventName extends string,
  EVentMap extends Record<EventName, any>,
>(
  eventNameRecipe: (name: EventName) => string,
  events: EventName[],
): Emitter<EventName, EVentMap> => {
  const listenerMatchMap = new Map<(...args: any[]) => any, (...args: any[]) => any>()

  const addEventListener = <E extends EventName>(
    event: E,
    listener: (payload: EVentMap[E]) => void,
  ): void => {
    if (listenerMatchMap.has(listener)) {
      return
    }

    const window = getWindow()
    if (!window) {
      return
    }

    const listenerAdepter = (event: CustomEvent) => {
      listener(event.detail)
    }

    listenerMatchMap.set(listener, listenerAdepter)

    window.addEventListener(eventNameRecipe(event), listenerAdepter as any)
  }

  const removeEventListener = <E extends EventName>(
    event: E,
    listener: (payload: EVentMap[E]) => void,
  ) => {
    const window = getWindow()
    if (!window) {
      return
    }
    const listenerAdepter = listenerMatchMap.get(listener)

    if (!listenerAdepter) {
      return
    }

    listenerMatchMap.delete(listener)

    window.removeEventListener(eventNameRecipe(event), listenerAdepter as any)
  }

  const emit = <E extends EventName>(event: E, payload: EVentMap[E]) => {
    const window = getWindow()
    if (!window) {
      return
    }
    const customEvent = new CustomEvent(eventNameRecipe(event), {detail: payload})

    window.dispatchEvent(customEvent)
  }

  const clear = () => {
    const window = getWindow()
    if (!window) {
      return
    }

    for (const listener of listenerMatchMap.values()) {
      for (const event of events) {
        window.removeEventListener(eventNameRecipe(event), listener as any)
      }
    }
  }

  return {addEventListener, clear, emit, removeEventListener}
}

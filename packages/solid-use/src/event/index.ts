/* eslint-disable n/no-unsupported-features/node-builtins */
import {createEffect, onCleanup} from 'solid-js'

import {resolveAccessor} from 'src/resolve-accessor'
import type {MaybeAccessor} from 'src/types'

export type UseEventOptions = boolean | AddEventListenerOptions

type UseEventListener<EventType extends Event> = {
  bivarianceHack(event: EventType): void
}['bivarianceHack']

export interface Emitter {
  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions): void

  removeEventListener(type: string, listener: EventListener, options?: EventListenerOptions): void
}

type EventTargetAccessor<Target> = MaybeAccessor<Target | null | undefined>

export interface OnEvent {
  <EventName extends keyof WindowEventMap>(
    target: EventTargetAccessor<Window>,
    type: EventName,
    listener: UseEventListener<WindowEventMap[EventName]>,
    options?: UseEventOptions,
  ): void
  <EventName extends keyof DocumentEventMap>(
    target: EventTargetAccessor<Document>,
    type: EventName,
    listener: UseEventListener<DocumentEventMap[EventName]>,
    options?: UseEventOptions,
  ): void
  <Target extends HTMLElement, EventName extends keyof HTMLElementEventMap>(
    target: EventTargetAccessor<Target>,
    type: EventName,
    listener: UseEventListener<HTMLElementEventMap[EventName]>,
    options?: UseEventOptions,
  ): void
  <Target extends Window | Document | HTMLElement>(
    target: EventTargetAccessor<Target>,
    type: string,
    listener: UseEventListener<CustomEvent<unknown>>,
    options?: UseEventOptions,
  ): void
  (
    target: EventTargetAccessor<EventTarget>,
    type: string,
    listener: UseEventListener<Event>,
    options?: UseEventOptions,
  ): void
}

export const useEvent: OnEvent = (
  target: EventTargetAccessor<Emitter | EventTarget>,
  type: string,
  listener: UseEventListener<never>,
  options: UseEventOptions = {},
) => {
  const targetAccessor = resolveAccessor(target)
  const eventListener = listener as EventListener

  createEffect(() => {
    const currentTarget = targetAccessor()

    if (currentTarget === null || currentTarget === undefined) {
      return
    }

    if (currentTarget instanceof EventTarget) {
      currentTarget.addEventListener(type, eventListener, options)

      onCleanup(() => {
        currentTarget.removeEventListener(type, eventListener, options)
      })
      return
    }

    const emitterOptions = typeof options === 'boolean' ? {capture: options} : options
    currentTarget.addEventListener(type, eventListener, emitterOptions)

    onCleanup(() => {
      currentTarget.removeEventListener(type, eventListener, emitterOptions)
    })
  })
}

import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {createEffect, onCleanup} from 'solid-js'

export interface Emitter {
  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions): void

  removeEventListener(type: string, listener: EventListener): void
}

export interface OnEvent {
  <K extends keyof WindowEventMap>(
    window: MaybeAccessor<Window | null>,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void
  <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void
  <K extends keyof HTMLElementEventMap>(
    element: MaybeAccessor<HTMLElement | null>,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void
  (
    window: MaybeAccessor<HTMLElement | Window | null>,
    type: string,
    listener: (event: CustomEvent) => void,
    options?: AddEventListenerOptions,
  ): void
}

export const useEvent: OnEvent = (
  element: MaybeAccessor<Emitter | null>,
  type: string,
  listener: (event: any) => void,
  options: AddEventListenerOptions = {},
) => {
  const elementAccessor = resolveAccessor(element)

  createEffect(() => {
    const element = elementAccessor()

    element?.addEventListener(type, listener, options)

    onCleanup(() => {
      element?.removeEventListener(type, listener)
    })

    return element
  })
}

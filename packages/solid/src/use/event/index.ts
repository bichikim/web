import {} from 'solid-js'
import {MayBeAccessor} from 'src/use/types'
import {resolveAccessor} from 'src/use/resolve-accessor'
import {useWatch} from 'src/use/watch'

export interface Listener {
  addEventListener(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void

  removeEventListener(type: string, listener: EventListener): void
}

export interface OnEvent {
  <K extends keyof WindowEventMap>(
    window: MayBeAccessor<Window | undefined>,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void
  (
    window: MayBeAccessor<Window | undefined>,
    type: string,
    listener: (event: CustomEvent) => void,
    options?: AddEventListenerOptions,
  ): void
  <K extends keyof HTMLElementEventMap>(
    window: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void
  (
    window: MayBeAccessor<HTMLElement | undefined>,
    type: string,
    listener: (event: CustomEvent) => void,
    options?: AddEventListenerOptions,
  ): void
  (
    window: MayBeAccessor<Element | undefined>,
    type: string,
    listener: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void
}

export const useEvent: OnEvent = (
  element: MayBeAccessor<Listener | undefined>,
  type: string,
  listener: (event: any) => void,
  options: AddEventListenerOptions = {},
) => {
  const elementAccessor = resolveAccessor(element)

  useWatch(elementAccessor, (element) => {
    element?.addEventListener(type, listener, options)
    return () => {
      element?.removeEventListener(type, listener)
    }
  })
}

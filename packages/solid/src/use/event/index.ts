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
    window: Window,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void
  (
    window: Window,
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
    window: HTMLElement,
    type: string,
    listener: (event: CustomEvent) => void,
    options?: AddEventListenerOptions,
  ): void
  (
    window: Element,
    type: string,
    listener: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void
}

export const onEvent: OnEvent = (
  element: MayBeAccessor<Listener>,
  type: string,
  listener: (event: any) => void,
  options: AddEventListenerOptions = {},
) => {
  const elementAccessor = resolveAccessor(element)

  useWatch(elementAccessor, (element) => {
    element.addEventListener(type, listener, options)
    return () => element.removeEventListener(type, listener)
  })
}

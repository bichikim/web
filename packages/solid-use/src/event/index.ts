import {MayBeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {useWatch} from 'src/watch'

export interface Emitter {
  addEventListener(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void

  removeEventListener(type: string, listener: EventListener): void
}

export interface OnEvent {
  <K extends keyof WindowEventMap>(
    window: MayBeAccessor<Window | null>,
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
    element: MayBeAccessor<HTMLElement | null>,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void
  (
    window: MayBeAccessor<HTMLElement | Window | null>,
    type: string,
    listener: (event: CustomEvent) => void,
    options?: AddEventListenerOptions,
  ): void
}

export const useEvent: OnEvent = (
  element: MayBeAccessor<Emitter | null>,
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

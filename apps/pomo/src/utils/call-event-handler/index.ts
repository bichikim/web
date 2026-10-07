import type {JSX} from 'solid-js'

/** Forwards a Solid event to a function or a bound handler, preserving the original event. */
export const callEventHandler = <Element extends HTMLElement, EventType extends Event>(
  handler: JSX.EventHandlerUnion<Element, EventType> | undefined,
  event: Parameters<JSX.EventHandler<Element, EventType>>[0],
): void => {
  if (typeof handler === 'function') {
    handler(event)
    return
  }
  handler?.[0](handler[1], event)
}

import type {JSX} from 'solid-js'

export const callEventHandler = <T extends HTMLElement, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: Parameters<JSX.EventHandler<T, E>>[0],
) => {
  if (typeof handler === 'function') {
    handler(event)
    return
  }
  handler?.[0](handler[1], event)
}

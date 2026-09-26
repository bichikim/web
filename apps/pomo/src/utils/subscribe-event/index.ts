export interface EventSubscriptionOptions extends AddEventListenerOptions {
  /** Called once after the returned unsubscribe function removes the listener. */
  readonly onUnsubscribe?: () => void
}

/** Registers a listener and returns an idempotent unsubscribe function with an optional notification. */
export const subscribeEvent = (
  target: EventTarget,
  eventType: string,
  handler: EventListenerOrEventListenerObject,
  options?: EventSubscriptionOptions,
): (() => void) => {
  const {onUnsubscribe, capture = false, ...listenerOptions} = options ?? {}
  let subscribed = true
  target.addEventListener(eventType, handler, {...listenerOptions, capture})
  return () => {
    if (!subscribed) {
      return
    }
    target.removeEventListener(eventType, handler, capture)
    subscribed = false
    onUnsubscribe?.()
  }
}

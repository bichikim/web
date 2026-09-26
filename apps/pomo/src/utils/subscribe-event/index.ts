/** Registers an event listener and returns a function that removes that registration. */
export const subscribeEvent = (
  target: EventTarget,
  eventType: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): (() => void) => {
  const capture = options?.capture ?? false
  target.addEventListener(eventType, handler, {...options, capture})
  return () => target.removeEventListener(eventType, handler, capture)
}

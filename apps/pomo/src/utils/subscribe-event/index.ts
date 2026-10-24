export interface EventSubscriptionOptions extends AddEventListenerOptions {
  /** 반환된 구독 해제 함수가 리스너를 제거한 뒤 한 번 호출한다. */
  readonly onUnsubscribe?: () => void
}

/** 리스너를 등록하고, 여러 번 호출해도 한 번만 해제하며 알림 콜백을 지정할 수 있는 구독 해제 함수를 반환한다. */
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

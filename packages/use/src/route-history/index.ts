export interface RouteHistory {
  back: string | null
  current: string
  forward: string | null
  position: number
  replaced: false
  scroll: {left: number; top: number}
}

/**
 * WIP
 * @param callback
 */
export const onRouteHistory = (callback: (state: RouteHistory, location: Location) => unknown) => {
  const original: any = window.onpopstate

  function onPopState(this: WindowEventHandlers, event: PopStateEvent) {
    if (typeof original === 'function') {
      original(event)
    }
    callback(event.state, document.location)
  }

  window.onpopstate = onPopState
}

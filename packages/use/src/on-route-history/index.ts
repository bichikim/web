import {ref, watch} from 'vue'

export interface RouteHistory {
  back: string | null
  current: string
  forward: string | null
  position: number
  replaced: false
  scroll: {left: number; top: number}
}

const original: any = window.onpopstate
const stateRef = ref<RouteHistory>()
const locationRef = ref<Location>(document.location)

function onPopState(this: WindowEventHandlers, event: PopStateEvent) {
  if (typeof original === 'function') {
    original(event)
  }
  stateRef.value = event.state
  locationRef.value = document.location
}

window.onpopstate = onPopState

/**
 * WIP
 * @param callback
 */
export const onRouteHistory = (callback: (state: RouteHistory, location: Location) => unknown) => {
  watch([stateRef, locationRef], ([state, location]) => {
    if (state) {
      callback(state, location)
    }
  })
}

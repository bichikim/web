import {ref, watch} from 'vue'
import {isSSR} from '@winter-love/utils'
import {useElementEvent} from '../element-event'

export interface RouteHistory {
  back: string | null
  current: string
  forward: string | null
  position: number
  replaced: false
  scroll: {left: number; top: number}
}

const _isSSR = isSSR()

const original: any = _isSSR ? undefined : window.onpopstate
const stateRef = ref<RouteHistory>()
const locationRef = ref<Location | undefined>(_isSSR ? undefined : document.location)

function onPopState(this: WindowEventHandlers, event: PopStateEvent) {
  if (typeof original === 'function') {
    original(event)
  }
  stateRef.value = event.state
  locationRef.value = document.location
}

if (!_isSSR) {
  useElementEvent(window, 'popstate', onPopState)
}

/**
 * @WIP
 * @param callback
 */
export const onRouteHistory = (callback: (state: RouteHistory, location: Location) => unknown) => {
  watch([stateRef, locationRef], ([state, location]) => {
    if (state && location) {
      callback(state, location)
    }
  })
}

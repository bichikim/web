import {isSSR} from '@winter-love/utils'
import {useElementEvent} from 'src/element-event'
import {MayRef} from '../types'
import {wrapRef} from '../wrap-ref'

export type OnOfflineCallBack = (event: Event) => unknown
export type OnOnlineCallBack = (event: Event) => unknown

/**
 * @deprecated please use useConnection
 * @param handler
 */
export const onOffline = (handler: OnOfflineCallBack) => {
  if (isSSR()) {
    return
  }

  useElementEvent(window, 'offline', handler, {capture: false, immediate: true, passive: true})
}

/**
 * @deprecated please use useConnection
 * @param handler
 */
export const onOnline = (handler: OnOnlineCallBack) => {
  if (isSSR()) {
    return
  }

  useElementEvent(window, 'online', handler, {capture: false, immediate: true, passive: true})
}

export const useConnection = (init: MayRef<boolean> = true) => {
  const value = wrapRef(init)

  if (!isSSR()) {
    useElementEvent(window, 'offline', () => {
      value.value = false
    }, {capture: false, immediate: true, passive: true})
    useElementEvent(window, 'online', () => {
      value.value = true
    }, {capture: false, immediate: true, passive: true})
  }

  return value
}

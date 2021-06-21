import {isSSR} from '@winter-love/utils'
import {useElementEvent} from 'src/element-event'
import {MayRef} from '../types'
import {wrapRef} from '../wrap-ref'

export type OnOfflineHandle = (event: Event) => unknown
export type OnOnlineHandle = (event: Event) => unknown

/**
 * @deprecated please use useConnection
 * @param handle
 */
export const onOffline = (handle: OnOfflineHandle) => {
  if (isSSR()) {
    return
  }

  return useElementEvent(
    window,
    'offline',
    handle,
    {capture: false, immediate: true, passive: true},
  )
}

/**
 * @deprecated please use useConnection
 * @param handle
 */
export const onOnline = (handle: OnOnlineHandle) => {
  if (isSSR()) {
    return
  }

  return useElementEvent(
    window,
    'online',
    handle,
    {capture: false, immediate: true, passive: true},
  )
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

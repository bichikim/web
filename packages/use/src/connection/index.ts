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
    true,
    {capture: false, passive: true},
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
    true,
    {capture: false, passive: true},
  )
}

export const useConnection = (init: MayRef<boolean> = true) => {
  const value = wrapRef(init)

  if (!isSSR()) {
    useElementEvent(window, 'offline', () => {
      value.value = false
    }, true, {capture: false, passive: true})
    useElementEvent(window, 'online', () => {
      value.value = true
    }, true, {capture: false, passive: true})
  }

  return value
}

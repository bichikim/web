import {useElementEvent} from 'src/element-event'
import {MayRef} from '../types'
import {wrapRef} from '../wrap-ref'

export type OnOfflineHandle = (event: Event) => unknown
export type OnOnlineHandle = (event: Event) => unknown

/**
 * @param handle
 */
export const onOffline = (handle: OnOfflineHandle) => {
  return useElementEvent(
    window,
    'offline',
    handle,
    true,
    {capture: false, passive: true},
  )
}

/**
 * @param handle
 */
export const onOnline = (handle: OnOnlineHandle) => {
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

  onOnline(() => {
    value.value = true
  })

  onOffline(() => {
    value.value = false
  })

  return value
}

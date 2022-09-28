import {useEvent} from 'src/use-event'
import {MaybeRef} from '../types'
import {resolveRef} from '../resolve-ref'
import {getWindow} from '@winter-love/utils'
import {bindRef} from 'src/bind-ref'

export type OnOfflineHandle = (event: Event) => unknown
export type OnOnlineHandle = (event: Event) => unknown

/**
 * @param handle
 */
export const onOffline = (handle: OnOfflineHandle) => {
  const window = getWindow()
  return useEvent(window, 'offline', handle, true, {capture: false, passive: true})
}

/**
 * @param handle
 */
export const onOnline = (handle: OnOnlineHandle) => {
  const window = getWindow()
  return useEvent(window, 'online', handle, true, {capture: false, passive: true})
}

export const useConnection = (init: MaybeRef<boolean> = true) => {
  const value = bindRef(resolveRef(init))

  onOnline(() => {
    value.value = true
  })

  onOffline(() => {
    value.value = false
  })

  return value
}

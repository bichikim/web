import {onEvent} from 'src/hooks/event'
import {MaybeRef} from '../types'
import {resolveRef} from 'src/refs/resolve-ref'
import {getWindow} from '@winter-love/utils'
import {mutRef} from 'src/refs/mut-ref'

export type OnOfflineHandle = (event: Event) => unknown
export type OnOnlineHandle = (event: Event) => unknown

/**
 * @param handle
 */
export const onOffline = (handle: OnOfflineHandle) => {
  const window = getWindow()
  return onEvent(window, 'offline', handle, true, {capture: false, passive: true})
}

/**
 * @param handle
 */
export const onOnline = (handle: OnOnlineHandle) => {
  const window = getWindow()
  return onEvent(window, 'online', handle, true, {capture: false, passive: true})
}

export const useConnection = (init: MaybeRef<boolean> = true) => {
  const value = mutRef(resolveRef(init))

  onOnline(() => {
    value.value = true
  })

  onOffline(() => {
    value.value = false
  })

  return value
}

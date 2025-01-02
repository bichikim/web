import {onEvent} from 'src/hooks/event'
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/refs/resolve-ref'
import {mutRef} from 'src/refs/mut-ref'
import {getWindow} from '@winter-love/utils'

export type OnOfflineHandle = (event: Event) => unknown
export type OnOnlineHandle = (event: Event) => unknown

/**
 * @param handle
 */
export const onOffline = (handle: OnOfflineHandle) => {
  const window = getWindow()

  return onEvent(window, 'offline', handle, {capture: false, passive: true})
}

/**
 * @param handle
 */
export const onOnline = (handle: OnOnlineHandle) => {
  const window = getWindow()

  return onEvent(window, 'online', handle, {capture: false, passive: true})
}

export const onConnection = (callback?: (value: boolean) => void) => {
  onOnline(() => {
    callback?.(true)
  })

  onOffline(() => {
    callback?.(false)
  })
}

export const useConnection = (init: MaybeRef<boolean> = true) => {
  const value = mutRef(resolveRef(init))

  onConnection((_value: boolean) => {
    value.value = _value
  })

  return value
}

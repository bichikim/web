import {isSSR} from '@winter-love/utils'
import {useElementEvent} from 'src/element-event'

export type OnOfflineCallBack = (event: Event) => unknown
export type OnOnlineCallBack = (event: Event) => unknown

export const onOffline = (handler: OnOfflineCallBack) => {
  if (isSSR()) {
    return
  }

  useElementEvent(window, 'offline', handler, {capture: false, immediate: true})
}

export const onOnline = (handler: OnOnlineCallBack) => {
  if (isSSR()) {
    return
  }

  useElementEvent(window, 'online', handler, {capture: false})
}

import {useElementEvent} from 'src/hooks/element-event'

export type OnOfflineCallBack = () => any
export type OnOnlineCallBack = () => any

export const onOffline = (callback: OnOfflineCallBack) => {
  useElementEvent(window, 'offline', callback, {capture: false})
}

export const onOnline = (callback: OnOnlineCallBack) => {
  useElementEvent(window, 'online', callback, {capture: false})
}

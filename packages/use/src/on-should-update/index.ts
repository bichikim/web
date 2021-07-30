import {useElementEvent} from '../element-event'
import {isSSR} from '@winter-love/utils'
import {useConnection} from '../connection'
import {watch} from 'vue-demi'
import {MayRef} from '../types'
import {useElementIntersection} from '../element-intersection'

export type OnShouldUpdateHandle = () => unknown

export interface OnShouldUpdateOptions {
  /**
   * call handle if document is visible with first using
   * @default true
   */
  firstExecute?: boolean
  /**
   * call handle with changing online
   * @default true
   */
  online?: boolean

  visibleElement?: MayRef<HTMLElement>

  /**
   * call handle with window focus event
   * @default true
   */
  windowFocus?: boolean
}

export const isVisible = () => {
  if (isSSR()) {
    return false
  }
  return document.visibilityState !== 'hidden'
}

/**
 * @experimental
 * @param handle
 * @param options
 */
export const onShouldUpdate = (handle?: OnShouldUpdateHandle, options: OnShouldUpdateOptions = {}) => {
  const {
    firstExecute = true,
    windowFocus = true,
    visibleElement,
    online = true,
  } = options
  const onShouldUpdate = () => handle?.()

  const onFocus = () => {
    if (windowFocus) {
      onShouldUpdate()
    }
  }

  const isOnline = useConnection(true)

  const isShowing = useElementIntersection(visibleElement)

  if (firstExecute && isVisible()) {
    onShouldUpdate()
  }

  watch(isShowing, (value) => {
    if (value) {
      onShouldUpdate()
    }
  })

  watch(isOnline, (value) => {
    if (online && value) {
      onShouldUpdate()
    }
  })

  useElementEvent(document, 'visibilitychange', onShouldUpdate)
  useElementEvent(window, 'focus', onFocus)

  return onShouldUpdate
}

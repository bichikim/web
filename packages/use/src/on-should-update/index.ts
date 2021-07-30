import {isSSR} from '@winter-love/utils'
import {useDebounce} from 'src/debounce'
import {watch} from 'vue-demi'
import {useConnection} from '../connection'
import {useElementEvent} from '../element-event'
import {useElementIntersection} from '../element-intersection'
import {MayRef} from '../types'

export type OnShouldUpdateHandle = () => unknown

export interface OnShouldUpdateOptions {
  /**
   * @default true
   */
  debounce?: number | boolean
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

  /**
   * @default true
   */
  visibleDocument?: boolean

  /**
   * call handle if the element is visible
   */
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

const defaultDebounceWait = 1000

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
    visibleDocument = true,
    debounce = defaultDebounceWait,
  } = options

  // noinspection SuspiciousTypeOfGuard
  const debounceWait = typeof debounce === 'boolean' ? defaultDebounceWait : debounce

  const thisDocument = isSSR() ? null : window.document

  const onHandle = () => {
    handle?.()
  }

  const onDebounceHandle = useDebounce(onHandle, debounceWait, true)

  const onShouldUpdate = () => {

    if (debounce) {
      onDebounceHandle()
      return
    }
    onHandle()
  }

  const onFocus = () => {
    if (windowFocus) {
      onShouldUpdate()
    }
  }

  const onVisibleDocument = (event) => {
    if (visibleDocument && event.target === thisDocument && isVisible()) {
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

  useElementEvent(document, 'visibilitychange', onVisibleDocument)
  useElementEvent(window, 'focus', onFocus)

  return onShouldUpdate
}

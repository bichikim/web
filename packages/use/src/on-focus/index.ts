import {useElementEvent} from '../element-event'
import {isSSR} from '@winter-love/utils'

export type FocusHandle = () => unknown

/**
 * @deprecated
 * @param handle
 */
export const onFocus = (handle?: FocusHandle) => {
  if (isSSR()) {
    return
  }

  const onFocus = () => handle?.()

  useElementEvent(window, 'focus', onFocus)
  useElementEvent(document, 'visibilitychange', onFocus)
}

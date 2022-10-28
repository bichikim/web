import {useEvent} from '../use-event'
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

  useEvent(window, 'focus', onFocus)
  useEvent(document, 'visibilitychange', onFocus)
}

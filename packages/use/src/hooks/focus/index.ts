import {onEvent} from 'src/hooks/event'
import {isSSR} from 'src/_imports/utils'

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

  onEvent(window, 'focus', onFocus)
  onEvent(document, 'visibilitychange', onFocus)
}

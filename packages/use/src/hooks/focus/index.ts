import {onEvent} from 'src/hooks/event'
import {getWindow} from '@winter-love/utils'

export type FocusHandle = () => unknown

/**
 * @deprecated
 * @param handle
 */
export const onFocus = (handle?: FocusHandle) => {
  const window = getWindow()
  if (!window) {
    return
  }

  const onFocus = () => handle?.()

  onEvent(window, 'focus', onFocus)
  onEvent(document, 'visibilitychange', onFocus)
}

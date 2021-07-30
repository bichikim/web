import {useElementEvent} from '../element-event'

export type FocusHandle = () => unknown

/**
 * @deprecated
 * @param handle
 */
export const onFocus = (handle?: FocusHandle) => {
  const onFocus = () => handle?.()

  useElementEvent(window, 'focus', onFocus)
  useElementEvent(document, 'visibilitychange', onFocus)
}

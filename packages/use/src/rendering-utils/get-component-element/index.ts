import {MaybeElement} from 'src/types'
import {isWindow} from '@winter-love/utils'

/**
 * (element | component) ref 에서 element 를 가져옵니다
 * @param maybeElement
 */
export const getComponentElement = (
  maybeElement?: MaybeElement,
): HTMLElement | Window | null => {
  if (maybeElement instanceof HTMLElement || isWindow(maybeElement)) {
    return maybeElement
  }

  if (maybeElement?.$el instanceof HTMLElement) {
    return maybeElement.$el
  }
  return null
}

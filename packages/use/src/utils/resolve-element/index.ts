import {MaybeElement} from 'src/types'

/**
 * (element | component) ref 에서 element 를 가져옵니다
 * @param maybeElement
 */
export const resolveElement = (maybeElement?: MaybeElement): HTMLElement | null => {
  if (maybeElement instanceof HTMLElement) {
    return maybeElement
  }

  if (maybeElement?.$el instanceof HTMLElement) {
    return maybeElement.$el
  }
  return null
}

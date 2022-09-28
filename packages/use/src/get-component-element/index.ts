import {ComponentPublicInstance} from 'vue'

/**
 * (element | component) ref 에서 element 를 가져옵니다
 * @param maybeElement
 */
export const getComponentElement = (
  maybeElement?: ComponentPublicInstance | HTMLElement,
): HTMLElement | null => {
  if (maybeElement instanceof HTMLElement) {
    return maybeElement
  }

  if (maybeElement?.$el instanceof HTMLElement) {
    return maybeElement.$el
  }
  return null
}

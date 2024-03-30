import {kebabCase} from '@winter-love/lodash'
export const getStyle = (
  element: Element,
  styleName: Exclude<keyof CSSStyleDeclaration, number | symbol>,
) => {
  return window.getComputedStyle(element).getPropertyValue(kebabCase(styleName))
}

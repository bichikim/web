import {kebabCase} from '@winter-love/lodash'
export const getStyle = (
  node: Element,
  styleName: Exclude<keyof CSSStyleDeclaration, number>,
) => {
  return window.getComputedStyle(node).getPropertyValue(kebabCase(styleName))
}

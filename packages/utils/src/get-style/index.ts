import {kebabCase} from '@winter-love/lodash'
import {getWindow} from 'src/get-window'

export const getStyle = (
  element: Element,
  styleName: Exclude<keyof CSSStyleDeclaration, number | symbol>,
) => {
  return getWindow()?.getComputedStyle(element).getPropertyValue(kebabCase(styleName))
}

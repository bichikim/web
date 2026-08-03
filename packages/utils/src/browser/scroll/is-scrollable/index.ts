import {getStyle} from 'src/browser/style/get-style'
const scrollRegex = /(?:auto|scroll)/u

export const isScrollable = (element: Element) => {
  return scrollRegex.test(
    `${getStyle(element, 'overflow')}${getStyle(element, 'overflowX')}${getStyle(element, 'overflowY')}`,
  )
}

/**
 * @deprecated Use `isScrollable` instead
 */
export const isScrollAble = isScrollable

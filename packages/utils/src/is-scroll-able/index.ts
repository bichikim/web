import {getStyle} from '../get-style'
const scrollRegex = /(auto|scroll)/u

export const isScrollable = (element: Element) => {
  return scrollRegex.test(
    `${getStyle(element, 'overflow')}${getStyle(element, 'overflowX')}${getStyle(element, 'overflowY')}`,
  )
}

/**
 * @deprecated Use `isScrollable` instead
 */
export const isScrollAble = isScrollable

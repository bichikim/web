import {getStyle} from '../get-style'
const scrollRegex = /(auto|scroll)/u

export const isScrollAble = (element: Element) => {
  return scrollRegex.test(
    `${getStyle(element, 'overflow')}${getStyle(element, 'overflowX')}${getStyle(element, 'overflowY')}`,
  )
}

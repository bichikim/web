import {getStyle} from '../get-style'
const scrollRegex = /(auto|scroll)/u
export const isScrollAble = (node: Element) => {
  return scrollRegex.test(
    getStyle(node, 'overflow') +
      getStyle(node, 'overflowX') +
      getStyle(node, 'overflowY'),
  )
}

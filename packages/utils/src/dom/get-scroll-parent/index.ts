import {isScrollAble} from '../is-scroll-able'
export const getScrollParent = (node: Element): ParentNode | Window => {
  let parent = node.parentNode

  while (parent) {
    if (isScrollAble(parent as any)) {
      return parent
    }
    parent = parent.parentElement
  }
  return window
}

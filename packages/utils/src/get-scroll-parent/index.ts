import {getWindow} from 'src/get-window'
import {isScrollAble} from '../is-scroll-able'

export const getScrollParent = (node: Element): ParentNode | Window | null => {
  let parent = node.parentNode

  while (parent) {
    if (isScrollAble(parent as any)) {
      return parent
    }

    parent = parent.parentElement
  }

  return getWindow()
}

import {getWindow} from 'src/browser/dom/get-window'
import {isScrollable} from '../is-scrollable'

export const getScrollParent = (node: Element): ParentNode | Window | null => {
  let parent = node.parentElement

  while (parent) {
    if (isScrollable(parent)) {
      return parent
    }

    parent = parent.parentElement
  }

  return getWindow()
}

import {isScrollable} from '../is-scrollable'

export const getScrollParents = (element: Element): ReadonlyArray<Element | Window> => {
  const scrollParents: Array<Element | Window> = []
  let parent = element.parentElement

  while (parent !== null) {
    if (isScrollable(parent)) {
      scrollParents.push(parent)
    }

    parent = parent.parentElement
  }

  const ownerWindow = element.ownerDocument.defaultView

  if (ownerWindow !== null) {
    scrollParents.push(ownerWindow)
  }

  return scrollParents
}

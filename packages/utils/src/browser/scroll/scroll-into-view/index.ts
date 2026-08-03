import _scrollIntoView, {StandardBehaviorOptions} from 'scroll-into-view-if-needed'
import smoothScrollIntoView from 'smooth-scroll-into-view-if-needed'
import {getDocument} from 'src/browser/dom/get-document'

export type {StandardBehaviorOptions} from 'scroll-into-view-if-needed'

export type ScrollIntoView = (target: Element, options?: StandardBehaviorOptions) => void

export const scrollIntoView: ScrollIntoView = (target, options) => {
  const document = getDocument()

  if (document && 'scrollBehavior' in document.documentElement.style) {
    _scrollIntoView(target, options)
    return
  }

  if (options === undefined) {
    smoothScrollIntoView(target)
    return
  }

  smoothScrollIntoView(target, options)
}

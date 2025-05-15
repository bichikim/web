import _scrollIntoView, {StandardBehaviorOptions} from 'scroll-into-view-if-needed'
import smoothScrollIntoView from 'smooth-scroll-into-view-if-needed'
import {getDocument} from 'src/get-document'

export type {StandardBehaviorOptions} from 'scroll-into-view-if-needed'

export type ScrollIntoView = (target: Element, options?: StandardBehaviorOptions) => void

const document = getDocument()

export const scrollIntoView: ScrollIntoView =
  document && 'scrollBehavior' in document.documentElement.style ? _scrollIntoView : (smoothScrollIntoView as any)

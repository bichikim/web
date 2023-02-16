import _scrollIntoView from 'scroll-into-view-if-needed'
import smoothScrollIntoView from 'smooth-scroll-into-view-if-needed'
import {getDocument} from 'src/dom/get-document'

export type {StandardBehaviorOptions} from 'scroll-into-view-if-needed'
const document = getDocument()
export const scrollIntoView =
  document && 'scrollBehavior' in document.documentElement.style
    ? _scrollIntoView
    : smoothScrollIntoView

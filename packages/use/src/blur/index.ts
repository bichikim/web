import {getDocument, getHTMLElement} from '@winter-love/utils'

export const useBlur = () => {
  return () => {
    const document = getDocument()
    const HTMLElement = getHTMLElement()
    if (!document || !HTMLElement) {
      return
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }
}

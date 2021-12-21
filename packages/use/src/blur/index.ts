import {getDocument, getHTMLElement} from '@winter-love/utils'

export const useBlur = () => {
  const document = getDocument()
  const HTMLElement = getHTMLElement()
  return () => {
    if (!document || !HTMLElement) {
      return
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }
}

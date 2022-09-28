import {getDocument} from '../get-document'

export const isListenable = (): boolean => {
  const document = getDocument()
  if (!document) {
    return false
  }
  return Boolean(document.addEventListener)
}

import {getDocument, getWindow} from '../browser'

export const isListenable = (): boolean => {
  const window = getWindow()
  if (!window) {
    return false
  }
  const document = getDocument()
  if (!document) {
    return false
  }
  return Boolean(document.addEventListener)
}

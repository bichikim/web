import {getDocument} from 'src/get-document'
import {getWindow} from 'src/get-window'

export const getWindowScrollPosition = () => {
  const window = getWindow()
  const document = getDocument()

  if (!window || !document) {
    return {
      x: 0,
      y: 0,
    }
  }

  return {
    x: window.pageXOffset || window.scrollX || document.body.scrollLeft || 0,
    y: window.pageYOffset || window.scrollY || document.body.scrollTop || 0,
  }
}

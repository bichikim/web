import {getWindow} from 'src/browser/dom/get-window'
import {isUndefined} from 'es-toolkit/predicate'

export const isElement = (value: any): value is Element => {
  const window = getWindow()
  const {Element} = window ?? ({} as any)

  if (isUndefined(Element)) {
    return false
  }

  return value instanceof Element
}

export const isHtmlElement = (value: any): value is HTMLElement => {
  const window = getWindow()
  const {HTMLElement} = window ?? ({} as any)

  if (isUndefined(HTMLElement)) {
    return false
  }

  return value instanceof HTMLElement
}

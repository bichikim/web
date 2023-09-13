import {getWindow} from 'src/dom/get-window'
import {isUndefined} from 'src/validate/is-undefined'
export const isElement = (value: any): value is Element => {
  const window = getWindow()
  const {Element} = window ?? {}
  if (isUndefined(Element)) {
    return false
  }
  return value instanceof Element
}

export const isHtmlElement = (value: any): value is HTMLElement => {
  const window = getWindow()
  const {HTMLElement} = window ?? {}
  if (isUndefined(HTMLElement)) {
    return false
  }
  return value instanceof HTMLElement
}

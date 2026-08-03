import {isNil} from 'es-toolkit/predicate'
import {getDocument} from 'src/browser/dom/get-document'

export const resolveElement = (value?: Element | string | null): null | Element | undefined => {
  if (isNil(value)) {
    return null
  }

  if (typeof value === 'string') {
    return getDocument()?.querySelector(value)
  }

  return value
}

/** @deprecated Use `resolveElement` instead. */
export const getElement = resolveElement

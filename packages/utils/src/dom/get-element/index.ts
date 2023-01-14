import {isNil} from 'src/validate/is-nil'

export const getElement = (value?: HTMLElement | string | null): null | HTMLElement => {
  if (isNil(value)) {
    return null
  }

  if (typeof value === 'string') {
    return document.querySelector(value)
  }
  return value
}

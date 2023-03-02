import {isNil} from 'src/validate/is-nil'

export const getElement = (
  value?: Element | string | null,
): null | Element | undefined => {
  if (isNil(value)) {
    return null
  }

  if (typeof value === 'string') {
    return document.querySelector(value)
  }
  return value
}

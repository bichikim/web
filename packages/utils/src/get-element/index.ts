export const getElement = (value?: HTMLElement | string | null): null | HTMLElement => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return document.querySelector(value)
  }
  return value
}

// eslint-disable-next-line prefer-named-capture-group
const unitRegex = /^[+-]?([0-9]{1,10})|(\.[0-9]{1,10})px$/u

export const getPxSize = (size: number | string, failBakeValue = 0) => {
  if (typeof size === 'number') {
    return size
  }
  let _size = size.trim()
  if (unitRegex.test(_size)) {
    if (_size.startsWith('.')) {
      _size = `0${_size}`
    }
    return Number(_size.replace(/px$/u, ''))
  }
  return failBakeValue
}

const DEFAULT_EM_SIZE = 16

export const toEm = (px: number, emSize: number = DEFAULT_EM_SIZE): number => {
  return px / emSize
}

export const toPx = (em: number, emSize: number = DEFAULT_EM_SIZE): number => {
  return em * emSize
}

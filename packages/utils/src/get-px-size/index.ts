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

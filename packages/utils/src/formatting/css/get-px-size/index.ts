const unitRegex = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/u

export const getPxSize = (size: number | string, failBakeValue = 0) => {
  if (typeof size === 'number') {
    return Number.isFinite(size) ? size : failBakeValue
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

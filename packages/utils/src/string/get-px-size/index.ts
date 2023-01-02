import {toNumber} from 'src/number/to-number'

const unitRegex = /^((?:[+-]?[0-9]{1,10})?(?:\.[0-9]{1,10})?)(?:px|r?em)?$/iu
export const getSize = (size: number | string, failValue: number = 0) => {
  // todo
}

export const getPxSize = (size: number | string, failValue: number = 0): number => {
  if (typeof size === 'number') {
    return size
  }
  return toNumber(size.replace(/px$/u, ''), failValue)
}

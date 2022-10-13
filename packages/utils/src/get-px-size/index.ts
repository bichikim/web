import {toNumber} from 'src/to-number'

export const getPxSize = (size: number | string, failValue: number = 0): number => {
  if (typeof size === 'number') {
    return size
  }
  return toNumber(size.replace(/px$/u, ''), failValue)
}

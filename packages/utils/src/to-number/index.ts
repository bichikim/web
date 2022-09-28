import {toNumber as _toNumber} from '@winter-love/lodash'

export const toNumber = (value?: any, failValue: number = 0): number => {
  const number = _toNumber(value)

  return Number.isNaN(number) ? failValue : number
}

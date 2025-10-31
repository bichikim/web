import {toNumber as _toNumber} from 'es-toolkit/compat'

export const toNumber = (value?: unknown, failValue: number = 0): number => {
  const number = _toNumber(value)

  return Number.isNaN(number) ? failValue : number
}

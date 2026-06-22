import {toNumber as _toNumber} from 'es-toolkit/compat'

export const toNumberOrUndefined = (value?: unknown): number | undefined => {
  const number = _toNumber(value)

  return Number.isNaN(number) ? undefined : number
}

export const toNumber = (value?: unknown, failValue: number = 0): number => {
  const number = toNumberOrUndefined(value)

  return number ?? failValue
}

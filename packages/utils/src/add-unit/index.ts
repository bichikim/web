import {toNumber} from 'src/to-number'
import {curryReverse} from 'src/curry'

export const addUnit = (value: unknown, unit: string = ''): string => {
  const numberValue = toNumber(value)

  return `${numberValue}${unit}`
}

// Default `unit` makes `Function#length` 1; arity 2 is required for partial application.
export const addUnitFn = curryReverse(addUnit, 2)

export const addUnitRight = addUnitFn

export const addPx = addUnitFn('px')

export const addEm = addUnitFn('em')

export const addRem = addUnitFn('rem')

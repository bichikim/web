import {toNumber} from 'src/to-number'

export const addUnit = (value: any, unit: string = ''): string => {
  const numberValue = toNumber(value)

  return `${numberValue}${unit}`
}

export interface ToUnitRight {
  (unit?: string): (value: any) => string

  (unit: string, value: any): string
}

export const addUnitRight: ToUnitRight = (unit?: string, value?: any): any => {
  if (value) {
    return addUnit(value, unit)
  }

  return (value: any) => {
    return addUnit(value, unit)
  }
}

export const addPx = addUnitRight('px')
export const addEm = addUnitRight('em')

export const addRem = addUnitRight('rem')

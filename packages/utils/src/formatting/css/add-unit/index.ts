import {toNumberOrUndefined} from 'src/formatting/number/to-number'
import {curryReverse} from 'src/core/functions/curry'
import {formatCssNumber} from 'src/formatting/css/format-css-number'
const DEFAULT_DECIMAL_PLACES = 3
const CSS_NUMBER_REGEX = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/iu

const parseCssNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()

  if (!CSS_NUMBER_REGEX.test(trimmedValue)) {
    return undefined
  }

  return toNumberOrUndefined(trimmedValue)
}

/**
 * Appends a CSS unit suffix to a number or non-empty numeric string.
 * @param value - Non-numeric and empty values yield `''`.
 * @param unit - Suffix (e.g. `px`, `rem`); default `''` returns digits only.
 * @param decimalPlaces - Rounds via `formatCssNumber` before formatting; default `3`.
 * @returns Unit string, or `''` when the value and precision cannot produce a finite number.
 */
export const addUnit = (
  value: unknown,
  unit: string = '',
  decimalPlaces: number = DEFAULT_DECIMAL_PLACES,
): string => {
  const numberValue = parseCssNumber(value)

  if (numberValue === undefined) {
    return ''
  }

  const formattedValue = formatCssNumber(numberValue, decimalPlaces)

  if (formattedValue === undefined) {
    return ''
  }

  return `${formattedValue}${unit}`
}

// Default `unit` and `decimalPlaces` make `Function#length` 1; explicit arity keeps partial application correct.
const ADD_UNIT_ARITY = 3

export const addUnitFn = curryReverse(addUnit, ADD_UNIT_ARITY)

/**
 * @deprecated Use `addUnitFn` instead
 */
export const addUnitRight = addUnitFn

export const addPx = addUnitFn(DEFAULT_DECIMAL_PLACES, 'px')

export const addEm = addUnitFn(DEFAULT_DECIMAL_PLACES, 'em')

export const addRem = addUnitFn(DEFAULT_DECIMAL_PLACES, 'rem')

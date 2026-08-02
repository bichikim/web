import {toNumberOrUndefined} from 'src/formatting/number/to-number'
import {curryReverse} from 'src/core/functions/curry'
import {formatCssNumber} from 'src/formatting/css/format-css-number'
const DEFAULT_DECIMAL_PLACES = 3
/**
 * Appends a CSS unit suffix to a coerced number (no space between number and unit).
 * @param value - Coerced with `toNumberOrUndefined`; unparseable values yield `''`.
 * @param unit - Suffix (e.g. `px`, `rem`); default `''` returns digits only.
 * @param decimalPlaces - Rounds via `formatCssNumber` before formatting; default `3`.
 * @returns Unit string, or `''` when `value` cannot be parsed or the number is non-finite after rounding.
 */
export const addUnit = (
  value: unknown,
  unit: string = '',
  decimalPlaces: number = DEFAULT_DECIMAL_PLACES,
): string => {
  const numberValue = toNumberOrUndefined(value)

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

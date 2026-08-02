const ROUNDING_BASE = 10

/**
 * Rounds a finite number for use in CSS length values.
 * @param value - The number to round.
 * @param decimalPlaces - A non-negative integer indicating how many decimal places to keep; default `2`.
 * @returns The rounded value as a string, or `undefined` when the inputs or result are invalid.
 */
export const formatCssNumber = (value: number, decimalPlaces: number = 2): string | undefined => {
  if (!Number.isFinite(value) || !Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    return undefined
  }

  const roundingFactor = ROUNDING_BASE ** decimalPlaces

  if (!Number.isFinite(roundingFactor)) {
    return undefined
  }

  const scaled = Math.round(value * roundingFactor) / roundingFactor

  if (!Number.isFinite(scaled)) {
    return undefined
  }

  return String(scaled)
}

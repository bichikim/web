const ROUNDING_BASE = 10

/**
 * Rounds a finite number for use in CSS length values.
 * @param value - The number to round.
 * @param decimalPlaces - How many decimal places to keep; default `2`.
 * @returns The rounded value as a string, or `undefined` when `value` is not finite.
 */
export const formatCssNumber = (value: number, decimalPlaces: number = 2): string | undefined => {
  if (!Number.isFinite(value)) {
    return undefined
  }

  const scaled = Math.round(value * ROUNDING_BASE ** decimalPlaces) / ROUNDING_BASE ** decimalPlaces

  return String(scaled)
}

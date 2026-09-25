/** Applies a lower bound before an optional upper bound. */
export const clampOptionalBounds = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => {
  const lowerBoundedValue = min === undefined ? value : Math.max(value, min)
  return max === undefined ? lowerBoundedValue : Math.min(lowerBoundedValue, max)
}

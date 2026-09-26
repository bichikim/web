import {clamp} from 'es-toolkit/math'
/** Applies a lower bound before an optional upper bound. */
export const clampOptionalBounds = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => {
  return clamp(value, min ?? -Infinity, max ?? Infinity)
}

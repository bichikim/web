import {clamp} from 'es-toolkit/math'

/** Clamps a finite value to the supplied bounds; missing or non-finite values return undefined. */
export const clampFiniteNumber = (
  value: number | undefined,
  min: number,
  max: number,
): number | undefined =>
  value !== undefined && Number.isFinite(value) ? clamp(value, min, max) : undefined

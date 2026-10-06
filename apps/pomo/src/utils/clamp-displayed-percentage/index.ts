import {clamp} from 'es-toolkit/math'

const MAXIMUM_PERCENTAGE = 100

/** Bounds finite display percentages; non-finite values remain indeterminate. */
export const clampDisplayedPercentage = (value: number | undefined): number | undefined =>
  value !== undefined && Number.isFinite(value) ? clamp(value, 0, MAXIMUM_PERCENTAGE) : undefined

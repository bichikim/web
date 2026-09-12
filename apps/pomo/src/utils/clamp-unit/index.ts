import {clamp} from 'es-toolkit/math'

const UNIT_MAXIMUM = 1
const UNIT_MINIMUM = 0

/** Returns the number clamped to the inclusive 0–1 range. */
export const clampUnit = (value: number): number => clamp(value, UNIT_MINIMUM, UNIT_MAXIMUM)

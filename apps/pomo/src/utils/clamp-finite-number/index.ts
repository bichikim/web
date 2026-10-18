import {clamp} from 'es-toolkit/math'

/** 유한한 값을 지정한 범위로 제한하며, 값이 없거나 유한하지 않으면 undefined를 반환한다. */
export const clampFiniteNumber = (
  value: number | undefined,
  min: number,
  max: number,
): number | undefined =>
  value !== undefined && Number.isFinite(value) ? clamp(value, min, max) : undefined

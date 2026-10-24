import {clamp} from 'es-toolkit/math'
import type {ClampNumberFallbackOptions, ClampNumberOptions} from './types'

export type {ClampNumberFallbackOptions, ClampNumberOptions} from './types'

/** 값을 지정한 범위로 제한하고, 문제 값에는 지정한 fallback을 반환한다. */
export function clampFiniteNumber<Fallback>(
  value: number | undefined,
  min: number,
  max: number,
  options: ClampNumberFallbackOptions<Fallback>,
): number | Fallback
export function clampFiniteNumber<Fallback = undefined>(
  value: number | undefined,
  min: number,
  max: number,
  options?: ClampNumberOptions<Fallback>,
): number | Fallback | undefined
export function clampFiniteNumber<Fallback = undefined>(
  value: number | undefined,
  min: number,
  max: number,
  options?: ClampNumberOptions<Fallback>,
): number | Fallback | undefined {
  const isInvalid =
    options?.isInvalid ?? ((candidate: number | undefined) => !Number.isFinite(candidate))
  return value === undefined || isInvalid(value) ? options?.fallback : clamp(value, min, max)
}

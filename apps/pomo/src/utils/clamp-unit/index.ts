import {
  clampFiniteNumber,
  type ClampNumberFallbackOptions,
  type ClampNumberOptions,
} from '../clamp-finite-number'

/** 값을 양 끝을 포함하는 0~1 범위로 제한하고, 문제 값에는 지정한 fallback을 반환한다. */
export function clampUnit<Fallback>(
  value: number | undefined,
  options: ClampNumberFallbackOptions<Fallback>,
): number | Fallback
export function clampUnit<Fallback = undefined>(
  value: number | undefined,
  options?: ClampNumberOptions<Fallback>,
): number | Fallback | undefined
export function clampUnit<Fallback = undefined>(
  value: number | undefined,
  options?: ClampNumberOptions<Fallback>,
): number | Fallback | undefined {
  return clampFiniteNumber(value, 0, 1, options)
}

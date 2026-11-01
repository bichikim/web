import type {TrackingPoint} from './types'
const MAXIMUM_FRAME_SECONDS = 0.1
const RESPONSE_SECONDS = 0.14
const SETTLE_DISTANCE = 0.001

/** Smooths toward the target, returning its exact coordinates once settled. */
export const smoothTrackingPoint = (
  current: TrackingPoint,
  target: TrackingPoint,
  seconds: number,
): TrackingPoint => {
  const amount =
    1 - Math.exp(-Math.max(0, Math.min(seconds, MAXIMUM_FRAME_SECONDS)) / RESPONSE_SECONDS)
  if (amount === 0) {
    return current
  }
  const next = {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
  }
  return Math.abs(target.x - next.x) + Math.abs(target.y - next.y) <= SETTLE_DISTANCE
    ? target
    : next
}

import type {TrackingPoint} from './types'
const MAXIMUM_FRAME_SECONDS = 0.1
const RESPONSE_SECONDS = 0.14

export const smoothTrackingPoint = (
  current: TrackingPoint,
  target: TrackingPoint,
  seconds: number,
): TrackingPoint => {
  const amount =
    1 - Math.exp(-Math.max(0, Math.min(seconds, MAXIMUM_FRAME_SECONDS)) / RESPONSE_SECONDS)
  return {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
  }
}

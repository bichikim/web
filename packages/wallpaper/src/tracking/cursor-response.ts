const DEPTH_RATIO = 0.3
const ANGLE_SCALE = 2 / Math.PI
const END_ANGLE = Math.atan(1 / DEPTH_RATIO) * ANGLE_SCALE
const END_SLOPE = (ANGLE_SCALE * DEPTH_RATIO) / (1 + DEPTH_RATIO ** 2)
const CORRECTION_POWER = 3

/** Distance in character heights: nearby atan response, easing to exactly 1 at one height. */
export const cursorResponse = (distance: number): number => {
  if (!Number.isFinite(distance) || distance <= 0) {
    return 0
  }
  if (distance >= 1) {
    return 1
  }
  const angle = Math.atan(distance / DEPTH_RATIO) * ANGLE_SCALE
  // This correction preserves the origin's value, slope and curvature, and ends with zero slope.
  const correction =
    distance ** CORRECTION_POWER *
    ((CORRECTION_POWER + 1 - CORRECTION_POWER * distance) * (1 - END_ANGLE) +
      (1 - distance) * END_SLOPE)
  return angle + correction
}

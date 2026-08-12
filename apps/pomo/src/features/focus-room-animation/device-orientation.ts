const DEVICE_ORIENTATION_RANGE_X = 18
const DEVICE_ORIENTATION_RANGE_Y = 14
const DEVICE_ORIENTATION_DEAD_ZONE = 0.025
const SCREEN_ANGLE_LANDSCAPE_PRIMARY = 90
const SCREEN_ANGLE_PORTRAIT_SECONDARY = 180
const SCREEN_ANGLE_LANDSCAPE_SECONDARY = 270
const HALF_ROTATION_DEGREES = 180
const FULL_ROTATION_DEGREES = 360

export interface OrientationAxes {
  readonly x: number
  readonly y: number
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value))
const removeDeadZone = (value: number) =>
  Math.abs(value) < DEVICE_ORIENTATION_DEAD_ZONE ? 0 : value
const normalizeAngle = (angle: number) =>
  ((angle % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
const getAngleDelta = (current: number, baseline: number) =>
  normalizeAngle(current - baseline + HALF_ROTATION_DEGREES) - HALF_ROTATION_DEGREES

export const getOrientationAxes = (
  beta: number | null,
  gamma: number | null,
  screenAngle: number,
): OrientationAxes | null => {
  if (beta === null || gamma === null) {
    return null
  }

  switch (normalizeAngle(screenAngle)) {
    case 0:
      return {x: gamma, y: beta}
    case SCREEN_ANGLE_LANDSCAPE_PRIMARY:
      return {x: beta, y: -gamma}
    case SCREEN_ANGLE_PORTRAIT_SECONDARY:
      return {x: -gamma, y: -beta}
    case SCREEN_ANGLE_LANDSCAPE_SECONDARY:
      return {x: -beta, y: gamma}
    default:
      return {x: gamma, y: beta}
  }
}

export const getOrientationOffset = (
  current: OrientationAxes,
  baseline: OrientationAxes,
): OrientationAxes => ({
  x: removeDeadZone(clamp(getAngleDelta(current.x, baseline.x) / DEVICE_ORIENTATION_RANGE_X)),
  y: removeDeadZone(clamp(getAngleDelta(current.y, baseline.y) / DEVICE_ORIENTATION_RANGE_Y)),
})

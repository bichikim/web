import {wrapDegrees} from 'src/utils/wrap-degrees'
import {clamp} from 'es-toolkit/math'

const DEVICE_ORIENTATION_RANGE_X = 18
const DEVICE_ORIENTATION_RANGE_Y = 14
const DEVICE_ORIENTATION_DEAD_ZONE = 0.025
const SCREEN_ANGLE_LANDSCAPE_PRIMARY = 90
const SCREEN_ANGLE_PORTRAIT_SECONDARY = 180
const SCREEN_ANGLE_LANDSCAPE_SECONDARY = 270
const HALF_ROTATION_DEGREES = 180

export interface OrientationAxes {
  readonly x: number
  readonly y: number
}

const removeDeadZone = (value: number) =>
  Math.abs(value) < DEVICE_ORIENTATION_DEAD_ZONE ? 0 : value
const getAngleDelta = (angle: number, baseline: number) =>
  wrapDegrees(angle - baseline + HALF_ROTATION_DEGREES) - HALF_ROTATION_DEGREES

export const getOrientationDelta = (
  current: OrientationAxes,
  baseline: OrientationAxes,
): OrientationAxes => ({
  x: getAngleDelta(current.x, baseline.x),
  y: getAngleDelta(current.y, baseline.y),
})

export const getOrientationAxes = (
  beta: number | null,
  gamma: number | null,
  screenAngle: number,
): OrientationAxes | null => {
  if (beta === null || gamma === null) {
    return null
  }

  switch (wrapDegrees(screenAngle)) {
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
): OrientationAxes => {
  const {x, y} = getOrientationDelta(current, baseline)
  return {
    x: removeDeadZone(clamp(x / DEVICE_ORIENTATION_RANGE_X, -1, 1)),
    y: removeDeadZone(clamp(y / DEVICE_ORIENTATION_RANGE_Y, -1, 1)),
  }
}

import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {CAMERA_SENSITIVITY, type FacePosition, type TrackingPoint} from './types'

interface CameraTargetOptions {
  readonly anchor: TrackingPoint
  readonly aspect: number
  readonly point: FacePosition
  readonly options?: PoffoTrackingOptions
}
const INCH_CENTIMETERS = 2.54
const HALF_TURN = 180
const HORIZONTAL_DEGREES = 30
const VERTICAL_DEGREES = 20
const RADIANS = Math.PI / HALF_TURN
const HEAD_HORIZONTAL = HORIZONTAL_DEGREES * RADIANS
const HEAD_VERTICAL = VERTICAL_DEGREES * RADIANS
const CAMERA_DIMENSIONS = {height: 3, width: 4}
const CAMERA_ASPECT = CAMERA_DIMENSIONS.width / CAMERA_DIMENSIONS.height
const bounded = (value: number) => Math.max(-1, Math.min(1, value))

/** Estimates a viewing direction in screen space from calibrated camera coordinates. */
export const createCameraTarget = ({
  anchor,
  aspect,
  point,
  options,
}: CameraTargetOptions): TrackingPoint => {
  if (point.detected === false) {
    return {x: 0, y: 0}
  }
  const settings = {...DEFAULT_TRACKING_OPTIONS, ...options}
  const screenHeight = (settings.screenDiagonal * INCH_CENTIMETERS) / Math.hypot(aspect, 1)
  const screenWidth = screenHeight * aspect
  const viewWidth = 2 * settings.distance * Math.tan((settings.cameraFov * RADIANS) / 2)
  const targetX =
    settings.cameraX * screenWidth + ((point.x - settings.centerX) / CAMERA_SENSITIVITY) * viewWidth
  const targetY =
    settings.cameraY * screenHeight -
    (((point.y - settings.centerY) / CAMERA_SENSITIVITY) * viewWidth) / CAMERA_ASPECT
  const horizontal = targetX - anchor.x * screenWidth
  const vertical = anchor.y * screenHeight - targetY
  return {
    x: bounded(Math.atan2(horizontal, settings.distance) / HEAD_HORIZONTAL),
    y: bounded(Math.atan2(vertical, Math.hypot(settings.distance, horizontal)) / HEAD_VERTICAL),
  }
}

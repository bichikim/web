import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {createCameraTarget} from './camera-target'
import type {CameraSurface, FacePosition, TrackingPoint} from './types'

interface CameraTrackingPointsOptions {
  readonly surface: CameraSurface
  readonly point: FacePosition
  readonly options?: PoffoTrackingOptions
}
interface CameraTrackingPoints {
  readonly origin: TrackingPoint
  readonly target: TrackingPoint
}
/** Resolves the fixed viewing origin and detected target within a character's screen bounds. */
export const cameraTrackingPoints = (
  options: CameraTrackingPointsOptions,
): CameraTrackingPoints => {
  const {surface, point, options: settings} = options
  const camera = {
    anchor: {
      x: surface.left + surface.width * (settings?.faceX ?? DEFAULT_TRACKING_OPTIONS.faceX),
      y: surface.top + surface.height * (settings?.faceY ?? DEFAULT_TRACKING_OPTIONS.faceY),
    },
    aspect: surface.aspect,
    options: settings,
  }
  return {
    origin:
      point.detected === false
        ? {x: 0, y: 0}
        : createCameraTarget({
            ...camera,
            point: {
              x: settings?.centerX ?? DEFAULT_TRACKING_OPTIONS.centerX,
              y: settings?.centerY ?? DEFAULT_TRACKING_OPTIONS.centerY,
            },
          }),
    target: createCameraTarget({...camera, point}),
  }
}

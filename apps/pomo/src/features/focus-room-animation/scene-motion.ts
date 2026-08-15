export type PSceneMotionMode = 'depth' | 'pan'
export type PSceneMotionInput = 'drag' | 'gyroscope'

const SCENE_CROP_ANCHOR = 60
const MAXIMUM_CROP_POSITION = 100

const clampHorizontalPosition = (position: number) => Math.max(-1, Math.min(1, position))

/** Reports whether this client is expected to provide device-orientation coordinates. */
export const supportsPSceneGyroscope = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
  'DeviceOrientationEvent' in window

/** Maps a normalized horizontal input to the full crop range around Pomo's preferred anchor. */
export const getPScenePanPosition = (horizontalPosition: number) => {
  const clampedPosition = clampHorizontalPosition(horizontalPosition)

  if (clampedPosition < 0) {
    return SCENE_CROP_ANCHOR + clampedPosition * SCENE_CROP_ANCHOR
  }

  return SCENE_CROP_ANCHOR + clampedPosition * (MAXIMUM_CROP_POSITION - SCENE_CROP_ANCHOR)
}

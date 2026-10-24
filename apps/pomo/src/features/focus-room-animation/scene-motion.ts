import {clamp} from 'es-toolkit/math'

export type PSceneMotionMode = 'depth' | 'pan'
export type PSceneMotionInput = 'drag' | 'gyroscope'

const SCENE_CROP_ANCHOR = 60
const MAXIMUM_CROP_POSITION = 100

/** Reports whether this client is expected to provide device-orientation coordinates. */
export const supportsPSceneGyroscope = (
  environment: Pick<MotionEnvironment, 'window' | 'getSensor'> = createMotionEnvironment(),
) =>
  environment.window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
  environment.getSensor() !== null

/** Maps a normalized horizontal input to the full crop range around Pomo's preferred anchor. */
export const getPScenePanPosition = (horizontalPosition: number) => {
  const clampedPosition = clamp(horizontalPosition, -1, 1)

  if (clampedPosition < 0) {
    return SCENE_CROP_ANCHOR + clampedPosition * SCENE_CROP_ANCHOR
  }

  return SCENE_CROP_ANCHOR + clampedPosition * (MAXIMUM_CROP_POSITION - SCENE_CROP_ANCHOR)
}
import {createMotionEnvironment, type MotionEnvironment} from './motion-environment'

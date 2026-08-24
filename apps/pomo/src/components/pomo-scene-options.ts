import type {
  PSceneMotionInput,
  PSceneMotionMode,
} from '../features/focus-room-animation/scene-motion'
import type {PGaze} from '../features/focus-room-scene-preferences'
import type {PViseme} from '../features/lip-sync'

/** Resolves the rendered gaze without mutating the user's configured preference. */
export const resolvePSceneGaze = (configuredGaze: PGaze, isDialogueActive: boolean): PGaze =>
  isDialogueActive ? 'user' : configuredGaze

/** Keeps the last external mouth shape through its return delay without masking live dialogue. */
export const resolvePSceneViseme = (
  dialogueViseme: PViseme,
  isDialoguePlaying: boolean,
  externalText: string | null,
  externalViseme: PViseme,
): PViseme =>
  !isDialoguePlaying && (externalText !== null || externalViseme !== 'rest')
    ? externalViseme
    : dialogueViseme

export const P_SCENE_MOTION_OPTIONS = [
  {icon: 'i-tabler-3d-cube-sphere', label: '3D 깊이', value: 'depth'},
  {icon: 'i-tabler-arrows-horizontal', label: '좌우 보기', value: 'pan'},
] as const satisfies readonly {
  readonly icon: string
  readonly label: string
  readonly value: PSceneMotionMode
}[]

export const P_SCENE_MOTION_INPUT_OPTIONS = [
  {icon: 'i-tabler-hand-move', label: '드래그', value: 'drag'},
  {icon: 'i-tabler-device-mobile-rotated', label: '자이로스코프', value: 'gyroscope'},
] as const satisfies readonly {
  readonly icon: string
  readonly label: string
  readonly value: PSceneMotionInput
}[]

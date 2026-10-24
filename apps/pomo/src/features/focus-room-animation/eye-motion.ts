import type {PixiScenePoint, PixiSceneTargetTranslation} from './layer-scene-definition'

export const EYE_TARGET_OFFSETS = [
  {x: 0, y: 0},
  {x: -0.45, y: 0},
  {x: 0.45, y: 0},
  {x: 0, y: -0.225},
  {x: 0, y: 0.225},
  {x: -0.32, y: -0.16},
  {x: 0.32, y: -0.16},
  {x: -0.32, y: 0.16},
  {x: 0.32, y: 0.16},
  {x: -0.9, y: 0},
  {x: 0.9, y: 0},
  {x: 0, y: -0.45},
  {x: 0, y: 0.45},
  {x: -0.64, y: -0.32},
  {x: 0.64, y: -0.32},
  {x: -0.64, y: 0.32},
  {x: 0.64, y: 0.32},
  {x: -1.5, y: 0},
  {x: 1.5, y: 0},
  {x: 0, y: -0.75},
  {x: 0, y: 0.75},
  {x: -1.06, y: -0.53},
  {x: 1.06, y: -0.53},
  {x: -1.06, y: 0.53},
  {x: 1.06, y: 0.53},
] as const satisfies readonly PixiScenePoint[]

/** Creates scene-owned rapid gaze motion around the measured horizontal origin. */
export const createEyeMotion = (originX = 0): PixiSceneTargetTranslation => ({
  kind: 'translation',
  targets: EYE_TARGET_OFFSETS.map(({x, y}) => ({x: originX + x, y})),
  transitionSeconds: 0.04,
  travel: {maximumSeconds: 3.2, minimumSeconds: 1.4},
})

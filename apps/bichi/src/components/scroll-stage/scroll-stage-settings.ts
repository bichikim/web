export const EASE = 0.05
export const SOFT_THRESHOLD = 0.01
export const CAMERA_FOV = 75
export const CAMERA_NEAR = 0.1
export const CAMERA_FAR = 10
export const CAMERA_Z = 2.5
export const ICOSAHEDRON_DETAIL = 64
export const ROTATION_SPEED = 0.05
export const MOBILE_SCALE = 0.75
export const PIXEL_RATIO_MAX = 1.5
export const EASE_MULTIPLIER = 2

export const SETTINGS = {
  uAmplitude: {end: 4, start: 4},
  uDeepPurple: {end: 0, start: 1},
  uDensity: {end: 1, start: 1},
  uFrequency: {end: 4, start: 0},
  uOpacity: {end: 0.66, start: 0.1},
  uStrength: {end: 1.1, start: 0},
} as const

export type UniformKey = keyof typeof SETTINGS

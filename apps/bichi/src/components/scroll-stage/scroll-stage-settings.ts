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
/** Particle system: wider distribution, iridescent (cosPalette) like glass object */
export const PARTICLE_COUNT = 570
export const PARTICLE_POINT_SIZE = 38
export const PARTICLE_SPHERE_RADIUS = 4.5
export const EASE_MULTIPLIER = 2

/** Glass/transmission params inspired by pmndrs/drei MeshTransmissionMaterial */
export const SETTINGS = {
  uAmplitude: {end: 4, start: 4},
  uChromaticAberration: {end: 0.05, start: 0.02},
  uDeepPurple: {end: 0.6, start: 0.2},
  uDensity: {end: 1, start: 1},
  uDistortion: {end: 0.4, start: 0.1},
  uDistortionScale: {end: 0.5, start: 0.5},
  uFrequency: {end: 4, start: 0},
  uOpacity: {end: 0.8, start: 0.35},
  uStrength: {end: 0.9, start: 0.15},
  uTemporalDistortion: {end: 0.1, start: 0},
  uThickness: {end: 0.3, start: 0.15},
} as const

export type UniformKey = keyof typeof SETTINGS

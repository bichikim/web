import {z} from 'zod'
export type PoffoTracking = 'off' | 'cursor' | 'camera' | 'camera-pose'
export const poffoTrackingSchema = z.enum(['off', 'cursor', 'camera', 'camera-pose'])
export interface PoffoTrackingOptions {
  /** Fraction of the body rig's horizontal range used by gaze; omission uses 1. */
  readonly bodyScale?: number
  /** Multiplier for body follow speed; omission uses 0.3, larger values follow faster. */
  readonly bodyFollowSpeed?: number
  /** Independent head follow speed; omission retains the original multiplier of 1. */
  readonly headFollowSpeed?: number
  /** Independent eye follow speed; omission retains the original multiplier of 1. */
  readonly eyeFollowSpeed?: number
  /** Cursor distance in character heights that reaches full movement; omitted uses 1. */
  readonly cursorReach?: number
  /** Eye-only cursor distance in character heights; omission uses 0.7. Head and body keep cursorReach. */
  readonly eyeCursorReach?: number
  readonly headCenterZ?: number
  readonly headLimitZ?: number
  readonly headResponseZ?: number
  readonly headResponseX?: number
  readonly headResponseY?: number
  readonly eyeResponseX?: number
  readonly eyeResponseY?: number

  readonly headMinimumX?: number
  readonly headMaximumX?: number
  readonly headMinimumY?: number
  readonly headMaximumY?: number
  readonly eyeMinimumX?: number
  readonly eyeMaximumX?: number
  readonly eyeMinimumY?: number
  readonly eyeMaximumY?: number
  readonly headCenterX?: number
  readonly headCenterY?: number
  readonly eyeCenterX?: number
  readonly eyeCenterY?: number
  readonly headLimitX?: number
  readonly headLimitY?: number
  readonly eyeLimitX?: number
  readonly eyeLimitY?: number
  readonly headVerticalScale?: number
  readonly headScale?: number
  readonly eyeVerticalScale?: number
  readonly eyeScale?: number
  readonly cameraX?: number
  readonly cameraY?: number
  readonly distance?: number
  readonly screenDiagonal?: number
  readonly cameraFov?: number
  readonly centerX?: number
  readonly centerY?: number
  readonly faceX?: number
  readonly faceY?: number
}
export const DEFAULT_TRACKING_OPTIONS: Required<PoffoTrackingOptions> = {
  bodyFollowSpeed: 0.3,
  bodyScale: 1,
  cameraFov: 60,
  cameraX: 0.5,
  cameraY: 0,
  centerX: 0,
  centerY: 0,
  cursorReach: 1,
  distance: 60,
  eyeCenterX: 0,
  eyeCenterY: 0,
  eyeCursorReach: 0.7,
  eyeFollowSpeed: 1,
  eyeLimitX: 1,
  eyeLimitY: 1,
  eyeMaximumX: 1,
  eyeMaximumY: 1,
  eyeMinimumX: -1,
  eyeMinimumY: -1,
  eyeResponseX: 1,
  eyeResponseY: 2.5,
  eyeScale: 1,
  eyeVerticalScale: 2.5,
  faceX: 0.5,
  faceY: 0.3,
  headCenterX: 0,
  headCenterY: 0,
  headCenterZ: 0,
  headFollowSpeed: 1,
  headLimitX: 30,
  headLimitY: 30,
  headLimitZ: 30,
  headMaximumX: 30,
  headMaximumY: 30,
  headMinimumX: -30,
  headMinimumY: -30,
  headResponseX: 1,
  headResponseY: 2.5,
  headResponseZ: 1,
  headScale: 1,
  headVerticalScale: 2.5,
  screenDiagonal: 27,
}
export const TRACKING_LIMITS = {
  bodyFollowSpeed: {max: 5, min: 0.1},
  bodyScale: {max: 1, min: 0},
  cameraFov: {max: 120, min: 20},
  cameraX: {max: 4, min: -3},
  cameraY: {max: 4, min: -3},
  centerX: {max: 1, min: -1},
  centerY: {max: 1, min: -1},
  cursorReach: {max: 3, min: 0.1},
  distance: {max: 300, min: 20},
  eyeCenterX: {max: 100, min: -100},
  eyeCenterY: {max: 100, min: -100},
  eyeCursorReach: {max: 3, min: 0.1},
  eyeFollowSpeed: {max: 5, min: 0.1},
  eyeLimitX: {max: 10, min: 0},
  eyeLimitY: {max: 10, min: 0},
  eyeMaximumX: {max: 10, min: -10},
  eyeMaximumY: {max: 10, min: -10},
  eyeMinimumX: {max: 10, min: -10},
  eyeMinimumY: {max: 10, min: -10},
  eyeResponseX: {max: 15, min: 0},
  eyeResponseY: {max: 15, min: 0},
  eyeScale: {max: 3, min: 0},
  eyeVerticalScale: {max: 5, min: 0},
  faceX: {max: 1, min: 0},
  faceY: {max: 1, min: 0},
  headCenterX: {max: 100, min: -100},
  headCenterY: {max: 100, min: -100},
  headCenterZ: {max: 100, min: -100},
  headFollowSpeed: {max: 5, min: 0.1},
  headLimitX: {max: 180, min: 0},
  headLimitY: {max: 180, min: 0},
  headLimitZ: {max: 180, min: 0},
  headMaximumX: {max: 180, min: -180},
  headMaximumY: {max: 180, min: -180},
  headMinimumX: {max: 180, min: -180},
  headMinimumY: {max: 180, min: -180},
  headResponseX: {max: 15, min: 0},
  headResponseY: {max: 15, min: 0},
  headResponseZ: {max: 15, min: 0},
  headScale: {max: 3, min: 0},
  headVerticalScale: {max: 5, min: 0},
  screenDiagonal: {max: 100, min: 10},
} as const
export const poffoTrackingOptionsSchema: z.ZodType<PoffoTrackingOptions> = z
  .object({
    bodyFollowSpeed: z
      .number()
      .min(TRACKING_LIMITS.bodyFollowSpeed.min)
      .max(TRACKING_LIMITS.bodyFollowSpeed.max)
      .optional(),
    bodyScale: z
      .number()
      .min(TRACKING_LIMITS.bodyScale.min)
      .max(TRACKING_LIMITS.bodyScale.max)
      .optional(),
    cameraFov: z
      .number()
      .min(TRACKING_LIMITS.cameraFov.min)
      .max(TRACKING_LIMITS.cameraFov.max)
      .optional(),
    cameraX: z
      .number()
      .min(TRACKING_LIMITS.cameraX.min)
      .max(TRACKING_LIMITS.cameraX.max)
      .optional(),
    cameraY: z
      .number()
      .min(TRACKING_LIMITS.cameraY.min)
      .max(TRACKING_LIMITS.cameraY.max)
      .optional(),
    centerX: z
      .number()
      .min(TRACKING_LIMITS.centerX.min)
      .max(TRACKING_LIMITS.centerX.max)
      .optional(),
    centerY: z
      .number()
      .min(TRACKING_LIMITS.centerY.min)
      .max(TRACKING_LIMITS.centerY.max)
      .optional(),
    cursorReach: z
      .number()
      .min(TRACKING_LIMITS.cursorReach.min)
      .max(TRACKING_LIMITS.cursorReach.max)
      .optional(),
    distance: z
      .number()
      .min(TRACKING_LIMITS.distance.min)
      .max(TRACKING_LIMITS.distance.max)
      .optional(),
    eyeCenterX: z
      .number()
      .min(TRACKING_LIMITS.eyeCenterX.min)
      .max(TRACKING_LIMITS.eyeCenterX.max)
      .optional(),
    eyeCenterY: z
      .number()
      .min(TRACKING_LIMITS.eyeCenterY.min)
      .max(TRACKING_LIMITS.eyeCenterY.max)
      .optional(),
    eyeCursorReach: z
      .number()
      .min(TRACKING_LIMITS.eyeCursorReach.min)
      .max(TRACKING_LIMITS.eyeCursorReach.max)
      .optional(),
    eyeFollowSpeed: z
      .number()
      .min(TRACKING_LIMITS.eyeFollowSpeed.min)
      .max(TRACKING_LIMITS.eyeFollowSpeed.max)
      .optional(),
    eyeLimitX: z
      .number()
      .min(TRACKING_LIMITS.eyeLimitX.min)
      .max(TRACKING_LIMITS.eyeLimitX.max)
      .optional(),
    eyeLimitY: z
      .number()
      .min(TRACKING_LIMITS.eyeLimitY.min)
      .max(TRACKING_LIMITS.eyeLimitY.max)
      .optional(),
    eyeMaximumX: z
      .number()
      .min(TRACKING_LIMITS.eyeMaximumX.min)
      .max(TRACKING_LIMITS.eyeMaximumX.max)
      .optional(),
    eyeMaximumY: z
      .number()
      .min(TRACKING_LIMITS.eyeMaximumY.min)
      .max(TRACKING_LIMITS.eyeMaximumY.max)
      .optional(),
    eyeMinimumX: z
      .number()
      .min(TRACKING_LIMITS.eyeMinimumX.min)
      .max(TRACKING_LIMITS.eyeMinimumX.max)
      .optional(),
    eyeMinimumY: z
      .number()
      .min(TRACKING_LIMITS.eyeMinimumY.min)
      .max(TRACKING_LIMITS.eyeMinimumY.max)
      .optional(),
    eyeResponseX: z
      .number()
      .min(TRACKING_LIMITS.eyeResponseX.min)
      .max(TRACKING_LIMITS.eyeResponseX.max)
      .optional(),
    eyeResponseY: z
      .number()
      .min(TRACKING_LIMITS.eyeResponseY.min)
      .max(TRACKING_LIMITS.eyeResponseY.max)
      .optional(),
    eyeScale: z
      .number()
      .min(TRACKING_LIMITS.eyeScale.min)
      .max(TRACKING_LIMITS.eyeScale.max)
      .optional(),
    eyeVerticalScale: z
      .number()
      .min(TRACKING_LIMITS.eyeVerticalScale.min)
      .max(TRACKING_LIMITS.eyeVerticalScale.max)
      .optional(),
    faceX: z.number().min(TRACKING_LIMITS.faceX.min).max(TRACKING_LIMITS.faceX.max).optional(),
    faceY: z.number().min(TRACKING_LIMITS.faceY.min).max(TRACKING_LIMITS.faceY.max).optional(),
    headCenterX: z
      .number()
      .min(TRACKING_LIMITS.headCenterX.min)
      .max(TRACKING_LIMITS.headCenterX.max)
      .optional(),
    headCenterY: z
      .number()
      .min(TRACKING_LIMITS.headCenterY.min)
      .max(TRACKING_LIMITS.headCenterY.max)
      .optional(),
    headCenterZ: z
      .number()
      .min(TRACKING_LIMITS.headCenterZ.min)
      .max(TRACKING_LIMITS.headCenterZ.max)
      .optional(),
    headFollowSpeed: z
      .number()
      .min(TRACKING_LIMITS.headFollowSpeed.min)
      .max(TRACKING_LIMITS.headFollowSpeed.max)
      .optional(),
    headLimitX: z
      .number()
      .min(TRACKING_LIMITS.headLimitX.min)
      .max(TRACKING_LIMITS.headLimitX.max)
      .optional(),
    headLimitY: z
      .number()
      .min(TRACKING_LIMITS.headLimitY.min)
      .max(TRACKING_LIMITS.headLimitY.max)
      .optional(),
    headLimitZ: z
      .number()
      .min(TRACKING_LIMITS.headLimitZ.min)
      .max(TRACKING_LIMITS.headLimitZ.max)
      .optional(),
    headMaximumX: z
      .number()
      .min(TRACKING_LIMITS.headMaximumX.min)
      .max(TRACKING_LIMITS.headMaximumX.max)
      .optional(),
    headMaximumY: z
      .number()
      .min(TRACKING_LIMITS.headMaximumY.min)
      .max(TRACKING_LIMITS.headMaximumY.max)
      .optional(),
    headMinimumX: z
      .number()
      .min(TRACKING_LIMITS.headMinimumX.min)
      .max(TRACKING_LIMITS.headMinimumX.max)
      .optional(),
    headMinimumY: z
      .number()
      .min(TRACKING_LIMITS.headMinimumY.min)
      .max(TRACKING_LIMITS.headMinimumY.max)
      .optional(),
    headResponseX: z
      .number()
      .min(TRACKING_LIMITS.headResponseX.min)
      .max(TRACKING_LIMITS.headResponseX.max)
      .optional(),
    headResponseY: z
      .number()
      .min(TRACKING_LIMITS.headResponseY.min)
      .max(TRACKING_LIMITS.headResponseY.max)
      .optional(),
    headResponseZ: z
      .number()
      .min(TRACKING_LIMITS.headResponseZ.min)
      .max(TRACKING_LIMITS.headResponseZ.max)
      .optional(),
    headScale: z
      .number()
      .min(TRACKING_LIMITS.headScale.min)
      .max(TRACKING_LIMITS.headScale.max)
      .optional(),
    headVerticalScale: z
      .number()
      .min(TRACKING_LIMITS.headVerticalScale.min)
      .max(TRACKING_LIMITS.headVerticalScale.max)
      .optional(),
    screenDiagonal: z
      .number()
      .min(TRACKING_LIMITS.screenDiagonal.min)
      .max(TRACKING_LIMITS.screenDiagonal.max)
      .optional(),
  })
  .refine(
    (options) => {
      const axes = [
        ['headMinimumX', 'headMaximumX', 'headLimitX'],
        ['headMinimumY', 'headMaximumY', 'headLimitY'],
        ['eyeMinimumX', 'eyeMaximumX', 'eyeLimitX'],
        ['eyeMinimumY', 'eyeMaximumY', 'eyeLimitY'],
      ] as const
      return axes.every(([minimum, maximum, limit]) => {
        const cap = options[limit] ?? DEFAULT_TRACKING_OPTIONS[limit]
        return (options[minimum] ?? -cap) <= (options[maximum] ?? cap)
      })
    },
    {message: '움직임 범위의 최소는 최대보다 클 수 없습니다.'},
  )
export interface PoffoTrackingBindings {
  /** Secondary horizontal body turn; omission leaves the character's body motion unchanged. */
  readonly bodyX?: PoffoTrackingBinding
  readonly headX?: PoffoTrackingBinding
  readonly headY?: PoffoTrackingBinding
  readonly headZ?: PoffoTrackingBinding
  readonly eyeX?: PoffoTrackingBinding
  readonly eyeY?: PoffoTrackingBinding
}
export interface PoffoTrackingBinding {
  /** How tracking meets animation values; omitted preserves overwrite behavior. */
  readonly blend?: 'add' | 'overwrite'
  readonly parameterId?: string | null
  readonly inverted?: boolean
}
const parameter = z
  .object({
    blend: z.enum(['add', 'overwrite']).optional(),
    inverted: z.boolean().optional(),
    parameterId: z.string().min(1).nullable().optional(),
  })
  .optional()
export const poffoBindingsSchema: z.ZodType<PoffoTrackingBindings> = z.object({
  bodyX: parameter,
  eyeX: parameter,
  eyeY: parameter,
  headX: parameter,
  headY: parameter,
  headZ: parameter,
})

export interface PoffoTrackingProfile {
  /** Calibration for this input; omission retains the legacy shared calibration. */
  readonly options?: PoffoTrackingOptions
  /** Rig connections for this input; omission retains the legacy shared connections. */
  readonly bindings?: PoffoTrackingBindings
}
export type PoffoTrackingProfiles = Readonly<Partial<Record<PoffoTracking, PoffoTrackingProfile>>>
export interface PoffoTrackingSettings {
  /** Selected input; omission leaves tracking off. */
  readonly tracking?: PoffoTracking
  /** Legacy calibration used for inputs that have not been configured separately. */
  readonly trackingOptions?: PoffoTrackingOptions
  /** Legacy connections used for inputs that have not been configured separately. */
  readonly trackingBindings?: PoffoTrackingBindings
  /** Independent input settings; omission retains the legacy shared settings. */
  readonly trackingProfiles?: PoffoTrackingProfiles
}
const trackingProfileSchema: z.ZodType<PoffoTrackingProfile> = z.object({
  bindings: poffoBindingsSchema.optional(),
  options: poffoTrackingOptionsSchema.optional(),
})
export const poffoTrackingProfilesSchema: z.ZodType<PoffoTrackingProfiles> = z.object({
  camera: trackingProfileSchema.optional(),
  'camera-pose': trackingProfileSchema.optional(),
  cursor: trackingProfileSchema.optional(),
  off: trackingProfileSchema.optional(),
})

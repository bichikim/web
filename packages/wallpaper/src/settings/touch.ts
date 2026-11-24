import {z} from 'zod'

export const TOUCH_AXES = ['auto', 'x', 'y', 'z', 'off'] as const
export type TouchAxis = (typeof TOUCH_AXES)[number]
export interface TouchJointResponse {
  readonly shoulder: number
  readonly elbow: number
  readonly wrist: number
}
export const DEFAULT_TOUCH_JOINT_RESPONSE: TouchJointResponse = {
  elbow: 0.6,
  shoulder: 0.25,
  wrist: 1,
}
export interface TouchParameterBinding {
  /** Painted parts that can start this input; omission allows every affected part. */
  readonly parts?: readonly string[]
  readonly axis?: TouchAxis
  readonly invert?: boolean
  readonly gain?: number
}
/** Stored arm connections from the earlier editor. */
export interface TouchArmChain {
  readonly id: string
  readonly name: string
  readonly enabled: boolean
  readonly parameters: {
    readonly shoulder?: string
    readonly elbow?: string
    readonly wrist?: string
  }
  readonly response?: TouchJointResponse
}
export interface TouchJoint {
  readonly id: string
  readonly parameterId?: string
  /** Interactive mobility and follow speed; zero leaves this joint to its animation. */
  readonly response: number
}
export interface TouchJointChain {
  readonly id: string
  readonly name: string
  readonly enabled: boolean
  /** Ordered from the anchored root toward the free end. */
  readonly joints: readonly TouchJoint[]
  readonly preserveAngle?: boolean
}
export type TouchJointParameterIds = readonly [string, string, string]
export interface PoffoTouch {
  /** Solve selected limb joints from the grabbed XY position instead of routing one axis. */
  readonly inverseKinematics?: boolean
  /** Relative joint mobility and follow speed, 0 (fixed) to 1 (immediate). */
  readonly jointResponse?: TouchJointResponse
  /** Ordered joint chains; earlier arm and tuple records remain readable. */
  readonly chains?: readonly (TouchJointChain | TouchArmChain | TouchJointParameterIds)[]
  readonly enabled: boolean
  readonly click: boolean
  readonly drag: boolean
  /** Fraction of each parameter's range used for a tap. */
  readonly amount: number
  /** CSS pixels of dragging corresponding to one parameter range. */
  readonly distance: number
  /** Milliseconds until a tap or released drag returns to the underlying animation. */
  readonly returnDuration: number
  /** Only these parameters react to touch. Omitted or empty selects none; `off` entries stay inactive. */
  readonly parameters?: Readonly<Record<string, TouchParameterBinding>>
}
export const DEFAULT_POFFO_TOUCH: PoffoTouch = {
  amount: 0.04,
  click: true,
  distance: 200,
  drag: true,
  enabled: false,
  returnDuration: 450,
}
export const TOUCH_LIMITS = {
  amount: {maximum: 0.5},
  distance: {maximum: 2000, minimum: 20},
  gain: {maximum: 5},
  returnDuration: {maximum: 5000, minimum: 100},
}
export const poffoTouchSchema: z.ZodType<PoffoTouch> = z.object({
  amount: z.number().finite().min(0).max(TOUCH_LIMITS.amount.maximum),
  chains: z
    .array(
      z.union([
        z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
        z.object({
          enabled: z.boolean(),
          id: z.string().min(1),
          joints: z
            .array(
              z.object({
                id: z.string().min(1),
                parameterId: z.string().min(1).optional(),
                response: z.number().finite().min(0).max(1),
              }),
            )
            .min(1),
          name: z.string(),
          preserveAngle: z.boolean().optional(),
        }),
        z.object({
          enabled: z.boolean(),
          id: z.string().min(1),
          name: z.string(),
          parameters: z.object({
            elbow: z.string().min(1).optional(),
            shoulder: z.string().min(1).optional(),
            wrist: z.string().min(1).optional(),
          }),
          response: z
            .object({
              elbow: z.number().finite().min(0).max(1),
              shoulder: z.number().finite().min(0).max(1),
              wrist: z.number().finite().min(0).max(1),
            })
            .optional(),
        }),
      ]),
    )
    .optional(),
  click: z.boolean(),
  distance: z
    .number()
    .finite()
    .min(TOUCH_LIMITS.distance.minimum)
    .max(TOUCH_LIMITS.distance.maximum),
  drag: z.boolean(),
  enabled: z.boolean(),
  inverseKinematics: z.boolean().optional(),
  jointResponse: z
    .object({
      elbow: z.number().finite().min(0).max(1),
      shoulder: z.number().finite().min(0).max(1),
      wrist: z.number().finite().min(0).max(1),
    })
    .optional(),
  parameters: z
    .record(
      z.string().min(1),
      z.object({
        axis: z.enum(TOUCH_AXES).optional(),
        gain: z.number().finite().min(0).max(TOUCH_LIMITS.gain.maximum).optional(),
        invert: z.boolean().optional(),
        parts: z.array(z.string().min(1)).optional(),
      }),
    )
    .optional(),
  returnDuration: z
    .number()
    .finite()
    .min(TOUCH_LIMITS.returnDuration.minimum)
    .max(TOUCH_LIMITS.returnDuration.maximum),
})

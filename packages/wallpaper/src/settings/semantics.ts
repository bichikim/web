import {z} from 'zod'

export const SEMANTIC_LIMIT = 128
export const SEMANTIC_TEXT_LIMIT = 4096
export const SEMANTIC_DESCRIPTION_LIMIT = 1000
export const SEMANTIC_ID_LIMIT = 128
export const SEMANTIC_THRESHOLD_MAX = 0.99
const MAX_GESTURE_CYCLES = 16
const MIN_GESTURE_PERIOD = 0.1
const MAX_GESTURE_PERIOD = 30
export interface SemanticAnimation {
  /** Seconds for one from-to-from cycle. */
  readonly period: number
  /** Cycle offset, from 0 to 1; omitted starts at the configured from value. */
  readonly phase?: number
  /** Repetitions before releasing the parameter; omitted repeats until the match ends. */
  readonly cycles?: number
}
export interface SemanticBinding {
  readonly animation?: SemanticAnimation
  readonly id: string
  readonly text: string
  /** Newline-separated examples that reject a paragraph when they match at least as closely. */
  readonly excludeText?: string
  readonly enabled: boolean
  readonly parameterId: string | null
  readonly mode: 'toggle' | 'range'
  readonly releaseWhenUnmatched?: boolean
  /** Only the strongest description in this group applies; omitted bindings can combine freely. */
  readonly exclusiveGroup?: string
  readonly threshold: number
  readonly from?: number
  readonly to?: number
}
export const semanticBindingsSchema = z
  .array(
    z.object({
      animation: z
        .object({
          cycles: z.number().int().min(1).max(MAX_GESTURE_CYCLES).optional(),
          period: z.number().finite().min(MIN_GESTURE_PERIOD).max(MAX_GESTURE_PERIOD),
          phase: z.number().finite().min(0).max(1).optional(),
        })
        .optional(),
      enabled: z.boolean(),
      excludeText: z.string().max(SEMANTIC_DESCRIPTION_LIMIT).optional(),
      exclusiveGroup: z.string().trim().min(1).max(SEMANTIC_ID_LIMIT).optional(),
      from: z.number().finite().optional(),
      id: z.string().min(1).max(SEMANTIC_ID_LIMIT),
      mode: z.enum(['toggle', 'range']),
      parameterId: z.string().min(1).nullable(),
      releaseWhenUnmatched: z.boolean().optional(),
      text: z.string().max(SEMANTIC_DESCRIPTION_LIMIT),
      threshold: z.number().finite().min(0).max(SEMANTIC_THRESHOLD_MAX),
      to: z.number().finite().optional(),
    }),
  )
  .max(SEMANTIC_LIMIT)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length)
export const semanticFrameSchema = z.object({
  scores: z
    .record(z.string().max(SEMANTIC_ID_LIMIT), z.number().finite().min(-1).max(1))
    .refine((scores) => Object.keys(scores).length <= SEMANTIC_LIMIT),
  widgetId: z.string().min(1).max(SEMANTIC_ID_LIMIT),
})
export const semanticInputSchema = z.object({
  text: z.string().max(SEMANTIC_TEXT_LIMIT),
  widgetId: z.string().min(1).max(SEMANTIC_ID_LIMIT),
})
export interface SemanticFrame {
  readonly widgetId: string
  /** Best eligible similarity; -1 means an exclusion won every paragraph comparison. */
  readonly scores: Readonly<Record<string, number>>
}
export interface SemanticInput {
  readonly widgetId: string
  readonly text: string
}

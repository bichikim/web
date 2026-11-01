import {z} from 'zod'

export const SEMANTIC_LIMIT = 128
export const SEMANTIC_TEXT_LIMIT = 4096
export const SEMANTIC_DESCRIPTION_LIMIT = 1000
export const SEMANTIC_ID_LIMIT = 128
export const SEMANTIC_THRESHOLD_MAX = 0.99
const MAX_GESTURE_CYCLES = 16
const MIN_GESTURE_PERIOD = 0.1
const MAX_GESTURE_PERIOD = 30
export interface SemanticExpressionAction {
  readonly kind: 'expression'
  readonly id: string
}
export interface SemanticMotionAction {
  readonly kind: 'motion'
  readonly id: string
}
export type SemanticAction = SemanticExpressionAction | SemanticMotionAction
export const semanticActionSchema: z.ZodType<SemanticAction> = z.discriminatedUnion('kind', [
  z.object({id: z.string().min(1).max(SEMANTIC_ID_LIMIT), kind: z.literal('expression')}),
  z.object({id: z.string().min(1).max(SEMANTIC_ID_LIMIT), kind: z.literal('motion')}),
])
export type SemanticActionRelease = 'speech-end' | 'next-speech'
export interface SemanticNarrationPlaying {
  readonly phase: 'playing'
  readonly readoutId: string
}
export interface SemanticNarrationInactive {
  readonly phase: 'waiting' | 'ended'
}
export type SemanticNarration = SemanticNarrationPlaying | SemanticNarrationInactive
const narrationSchema: z.ZodType<SemanticNarration> = z.discriminatedUnion('phase', [
  z.object({phase: z.literal('playing'), readoutId: z.string().min(1).max(SEMANTIC_ID_LIMIT)}),
  z.object({phase: z.enum(['waiting', 'ended'])}),
])
export interface SemanticAnimation {
  /** Seconds for one from-to-from cycle. */
  readonly period: number
  /** Cycle offset, from 0 to 1; omitted starts at the configured from value. */
  readonly phase?: number
  /** Repetitions before releasing the parameter; omitted repeats until the match ends. */
  readonly cycles?: number
}
export interface SemanticBinding {
  /** Character-defined expression or motion to execute when matched. */
  readonly action?: SemanticAction
  /** Only behavior bindings can be randomly selected; omitted is treated as an emotion. */
  readonly category?: 'emotion' | 'behavior'
  readonly animation?: SemanticAnimation
  readonly id: string
  readonly text: string
  /** Newline-separated examples that reject a paragraph when they match at least as closely. */
  readonly excludeText?: string
  readonly enabled: boolean
  readonly parameterId: string | null
  readonly mode: 'toggle' | 'range'
  /** Action release point; omitted releases at narration end. Manual previews stop explicitly. */
  readonly release?: SemanticActionRelease
  readonly releaseWhenUnmatched?: boolean
  /** Action bindings select one winner per group; omitted uses the default group. */
  readonly exclusiveGroup?: string
  readonly threshold: number
  readonly from?: number
  readonly to?: number
}
export const semanticBindingsSchema = z
  .array(
    z.object({
      action: semanticActionSchema.optional(),
      animation: z
        .object({
          cycles: z.number().int().min(1).max(MAX_GESTURE_CYCLES).optional(),
          period: z.number().finite().min(MIN_GESTURE_PERIOD).max(MAX_GESTURE_PERIOD),
          phase: z.number().finite().min(0).max(1).optional(),
        })
        .optional(),
      category: z.enum(['emotion', 'behavior']).optional(),
      enabled: z.boolean(),
      excludeText: z.string().max(SEMANTIC_DESCRIPTION_LIMIT).optional(),
      exclusiveGroup: z.string().trim().min(1).max(SEMANTIC_ID_LIMIT).optional(),
      from: z.number().finite().optional(),
      id: z.string().min(1).max(SEMANTIC_ID_LIMIT),
      mode: z.enum(['toggle', 'range']),
      parameterId: z.string().min(1).nullable(),
      release: z.enum(['speech-end', 'next-speech']).optional(),
      releaseWhenUnmatched: z.boolean().optional(),
      text: z.string().max(SEMANTIC_DESCRIPTION_LIMIT),
      threshold: z.number().finite().min(0).max(SEMANTIC_THRESHOLD_MAX),
      to: z.number().finite().optional(),
    }),
  )
  .max(SEMANTIC_LIMIT)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length)
export const semanticFrameSchema = z.object({
  fallbackId: z.string().min(1).max(SEMANTIC_ID_LIMIT).optional(),
  narration: narrationSchema.optional(),
  previewId: z.string().min(1).max(SEMANTIC_ID_LIMIT).optional(),
  scores: z
    .record(z.string().max(SEMANTIC_ID_LIMIT), z.number().finite().min(-1).max(1))
    .refine((scores) => Object.keys(scores).length <= SEMANTIC_LIMIT),
  widgetId: z.string().min(1).max(SEMANTIC_ID_LIMIT),
})
export const semanticInputSchema = z.object({
  narration: narrationSchema.optional(),
  readoutId: z.string().min(1).max(SEMANTIC_ID_LIMIT).optional(),
  text: z.string().max(SEMANTIC_TEXT_LIMIT),
  widgetId: z.string().min(1).max(SEMANTIC_ID_LIMIT),
})
export interface SemanticFrame {
  readonly widgetId: string
  /** Audio lifecycle; omitted preserves text-only matching and explicit clearing. */
  readonly narration?: SemanticNarration
  /** Manually execute only this binding at full strength; omitted uses automatic scores. */
  readonly previewId?: string
  /** Behavior chosen once for an unmatched narration; never an emotion. */
  readonly fallbackId?: string
  /** Best eligible similarity; -1 means an exclusion won every paragraph comparison. */
  readonly scores: Readonly<Record<string, number>>
}
export interface SemanticInput {
  /** Audio lifecycle; omitted preserves text-only matching and explicit clearing. */
  readonly narration?: SemanticNarration
  /** Narration identity when the explicit audio lifecycle is omitted. */
  readonly readoutId?: string
  readonly widgetId: string
  readonly text: string
}

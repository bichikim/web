import {z} from 'zod'

export const SEMANTIC_LIMIT = 64
export const SEMANTIC_TEXT_LIMIT = 4096
export const SEMANTIC_DESCRIPTION_LIMIT = 1000
export const SEMANTIC_ID_LIMIT = 128
export const SEMANTIC_THRESHOLD_MAX = 0.99
export interface SemanticBinding {
  readonly id: string
  readonly text: string
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
      enabled: z.boolean(),
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
  readonly scores: Readonly<Record<string, number>>
}
export interface SemanticInput {
  readonly widgetId: string
  readonly text: string
}

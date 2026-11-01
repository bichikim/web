import {z} from 'zod'
import {SEMANTIC_ID_LIMIT, SEMANTIC_LIMIT} from './semantics'

export interface RandomActionSettings {
  /** Enables one fallback draw per new narration; omitted settings disable fallback. */
  readonly enabled: boolean
  /** Chance from 0 to 1, applied only when no semantic action matches. */
  readonly probability: number
  /** Semantic behavior binding IDs; emotion bindings are never eligible. */
  readonly bindingIds: readonly string[]
}
export const randomActionSettingsSchema: z.ZodType<RandomActionSettings> = z.object({
  bindingIds: z
    .array(z.string().min(1).max(SEMANTIC_ID_LIMIT))
    .max(SEMANTIC_LIMIT)
    .refine((ids) => new Set(ids).size === ids.length),
  enabled: z.boolean(),
  probability: z.number().finite().min(0).max(1),
})

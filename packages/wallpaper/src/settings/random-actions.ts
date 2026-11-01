import {z} from 'zod'

export interface RandomActionSettings {
  /** Enables one fallback draw per new narration; omitted settings disable fallback. */
  readonly enabled: boolean
  /** Chance from 0 to 1, applied only when no emotion or contextual pose matches. */
  readonly probability: number
}
export const randomActionSettingsSchema: z.ZodType<RandomActionSettings> = z.object({
  enabled: z.boolean(),
  probability: z.number().finite().min(0).max(1),
})

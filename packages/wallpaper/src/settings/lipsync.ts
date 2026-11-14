import {z} from 'zod'
import type {PoffoTrackingBinding} from './tracking'

export const LIP_SYNC_SHAPES = ['a', 'i', 'u', 'e', 'o', 'closed'] as const
export type LipSyncShape = (typeof LIP_SYNC_SHAPES)[number]
export type LipSyncSource = 'off' | 'voice' | 'speech'
export const MAXIMUM_LIPSYNC_GAIN = 3
export interface PoffoLipSync extends PoffoTrackingBinding {
  readonly shapes?: Partial<Record<LipSyncShape, PoffoTrackingBinding>>
  readonly source: LipSyncSource
  readonly gain?: number
}
export const poffoLipSyncSchema = z.object({
  gain: z.number().finite().min(0).max(MAXIMUM_LIPSYNC_GAIN).optional(),
  inverted: z.boolean().optional(),
  parameterId: z.string().min(1).nullable().optional(),
  shapes: z
    .partialRecord(
      z.enum(LIP_SYNC_SHAPES),
      z.object({
        inverted: z.boolean().optional(),
        parameterId: z.string().min(1).nullable().optional(),
      }),
    )
    .optional(),
  source: z.enum(['off', 'voice', 'speech']),
})

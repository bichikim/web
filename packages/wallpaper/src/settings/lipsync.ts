import {z} from 'zod'
import type {PoffoTrackingBinding} from './tracking'

export type LipSyncSource = 'off' | 'voice' | 'speech'
export const MAXIMUM_LIPSYNC_GAIN = 3
export interface PoffoLipSync extends PoffoTrackingBinding {
  readonly source: LipSyncSource
  readonly gain?: number
}
export const poffoLipSyncSchema = z.object({
  gain: z.number().finite().min(0).max(MAXIMUM_LIPSYNC_GAIN).optional(),
  inverted: z.boolean().optional(),
  parameterId: z.string().min(1).nullable().optional(),
  source: z.enum(['off', 'voice', 'speech']),
})
